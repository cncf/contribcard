//! This modules defines some SQL statements to setup and interact with the
//! database.

/// Copy commits from the temporary database to the cache database.
pub(crate) const COPY_COMMITS_TO_CACHE: &str = "
INSERT INTO cache.commit
SELECT * FROM commit
ON CONFLICT DO NOTHING
";

/// Copy issues from the temporary database to the cache database.
pub(crate) const COPY_ISSUES_TO_CACHE: &str = "
INSERT INTO cache.issue
SELECT * FROM issue
ON CONFLICT DO NOTHING
";

/// Copy pull requests from the temporary database to the cache database.
pub(crate) const COPY_PULL_REQUESTS_TO_CACHE: &str = "
INSERT INTO cache.pull_request
SELECT * FROM pull_request
ON CONFLICT DO NOTHING
";

/// Create commit table.
pub(crate) const CREATE_COMMIT_TABLE: &str = "
CREATE TABLE IF NOT EXISTS commit (
    owner VARCHAR,
    repository VARCHAR,
    sha VARCHAR,
    author_id BIGINT,
    author_login VARCHAR,
    ts TIMESTAMP,
    title VARCHAR,
    parents UINTEGER,
    PRIMARY KEY (owner, repository, sha)
);
";

/// Create contribution table.
pub(crate) const CREATE_CONTRIBUTION_TABLE: &str = "
CREATE TABLE IF NOT EXISTS contribution (
    kind VARCHAR,
    owner VARCHAR,
    repository VARCHAR,
    sha VARCHAR,
    number BIGINT,
    author_id BIGINT,
    author_login VARCHAR,
    ts TIMESTAMP,
    title VARCHAR
);
";

/// Create issue table.
pub(crate) const CREATE_ISSUE_TABLE: &str = "
CREATE TABLE IF NOT EXISTS issue (
    owner VARCHAR,
    repository VARCHAR,
    number BIGINT,
    author_id BIGINT,
    author_login VARCHAR,
    ts TIMESTAMP,
    title VARCHAR,
    PRIMARY KEY (owner, repository, number)
);
";

/// Create pull request table.
pub(crate) const CREATE_PULL_REQUEST_TABLE: &str = "
CREATE TABLE IF NOT EXISTS pull_request (
    owner VARCHAR,
    repository VARCHAR,
    number BIGINT,
    author_id BIGINT,
    author_login VARCHAR,
    ts TIMESTAMP,
    title VARCHAR,
    PRIMARY KEY (owner, repository, number)
);
";

/// Get contributions summaries of all contributors.
pub(crate) const GET_ALL_CONTRIBUTORS_SUMMARIES: &str = "
SELECT
    author_login AS contributor,
    json_object(
        'id', author_id,
        'login', author_login,
        'contributions', (
            SELECT json_object(
                'total', (
                    SELECT count(*)
                    FROM contribution
                    WHERE author_id = contributor.author_id
                ),
                'by_kind', (
                    SELECT json_object(
                        'commit', (
                            SELECT count(*)
                            FROM contribution
                            WHERE kind = 'commit'
                            AND author_id = contributor.author_id
                        ),
                        'issue', (
                            SELECT count(*)
                            FROM contribution
                            WHERE kind = 'issue'
                            AND author_id = contributor.author_id
                        ),
                        'pull_request', (
                            SELECT count(*)
                            FROM contribution
                            WHERE kind = 'pull_request'
                            AND author_id = contributor.author_id
                        )
                    )
                )
            )
        ),
        'repositories', (
            SELECT list(
                format('{}/{}', owner, repository)
                ORDER BY total DESC, owner ASC, repository ASC
            )
            FROM (
                SELECT DISTINCT owner, repository, count(*) AS total
                FROM contribution
                WHERE author_id = contributor.author_id
                GROUP BY owner, repository
            )
        ),
        'years', (
            SELECT list_reverse_sort(list(DISTINCT extract('year' FROM ts)))
            FROM contribution
            WHERE author_id = contributor.author_id
        ),
        'first_contribution', (
            SELECT json_object(
                'kind', kind,
                'owner', owner,
                'repository', repository,
                'sha', sha,
                'number', number,
                'title', title,
                'ts', extract('epoch' FROM ts)::BIGINT
            ) FROM contribution
            WHERE author_id = contributor.author_id
            ORDER BY ts ASC, owner ASC, repository ASC, title ASC, number ASC, sha ASC
            LIMIT 1
        )
    ) AS summary
FROM (
    SELECT author_id, first(author_login ORDER BY ts DESC) as author_login
    FROM contribution
    GROUP BY author_id
) AS contributor
";

/// Get the id and login of all contributors.
pub(crate) const GET_CONTRIBUTORS: &str = "
SELECT json_group_object(login, id)
FROM (
    SELECT author_id AS id, first(author_login ORDER BY ts DESC) AS login
    FROM contribution
    GROUP BY author_id
) AS contributor;
";

/// Get last commit timestamp.
pub(crate) const GET_LAST_COMMIT_TS: &str = "
SELECT ts
FROM commit
WHERE owner = ?
AND repository = ?
ORDER BY ts DESC
LIMIT 1;
";

/// Get last issue or pull request timestamp (we'll pick the older).
pub(crate) const GET_LAST_ISSUE_OR_PULL_REQUEST_TS: &str = "
(
    SELECT ts
    FROM issue
    WHERE owner = $1
    AND repository = $2
    ORDER BY ts DESC
    LIMIT 1
)
UNION
(
    SELECT ts
    FROM pull_request
    WHERE owner = $1
    AND repository = $2
    ORDER BY ts DESC
    LIMIT 1
)
ORDER BY ts ASC
LIMIT 1;
";

/// Load commits from json file.
pub(crate) const LOAD_COMMITS_FROM_JSON_FILE: &str = "
INSERT INTO commit
SELECT
    ? AS owner,
    ? AS repository,
    sha,
    author.id AS author_id,
    trim(author.login, '\"') AS author_login,
    commit.committer.date AS ts,
    split_part(commit.message, E'\n\n', 1) AS title,
    len(parents) as parents
FROM read_json(?)
WHERE author.login IS NOT NULL
ON CONFLICT DO NOTHING;
";

/// Load contributions from commits, issues and pull requests in the cache db.
pub(crate) const LOAD_CONTRIBUTIONS_FROM_CACHE: &str = "
BEGIN;

INSERT INTO contribution (
    kind,
    owner,
    repository,
    sha,
    author_id,
    author_login,
    ts,
    title
)
SELECT
    'commit',
    owner,
    repository,
    sha,
    author_id,
    author_login,
    ts,
    title
FROM cache.commit;

INSERT INTO contribution (
    kind,
    owner,
    repository,
    number,
    author_id,
    author_login,
    ts,
    title
)
SELECT
    'issue',
    owner,
    repository,
    number,
    author_id,
    author_login,
    ts,
    title
FROM cache.issue;

INSERT INTO contribution (
    kind,
    owner,
    repository,
    number,
    author_id,
    author_login,
    ts,
    title
)
SELECT
    'pull_request',
    owner,
    repository,
    number,
    author_id,
    author_login,
    ts,
    title
FROM cache.pull_request;

COMMIT;
";

/// Load issues from json file.
pub(crate) const LOAD_ISSUES_FROM_JSON_FILE: &str = r"
INSERT INTO issue
SELECT
    ? AS owner,
    ? AS repository,
    number,
    user.id as author_id,
    user.login as author_login,
    created_at as ts,
    title
FROM read_json(?)
WHERE regexp_matches(html_url, '.*/issues/\d+$')
ON CONFLICT DO NOTHING;
";

/// Load pull requests from json file.
pub(crate) const LOAD_PULL_REQUESTS_FROM_JSON_FILE: &str = r"
INSERT INTO pull_request
SELECT
    ? AS owner,
    ? AS repository,
    number,
    user.id as author_id,
    user.login as author_login,
    created_at as ts,
    title
FROM read_json(?)
WHERE regexp_matches(html_url, '.*/pull/\d+$')
ON CONFLICT DO NOTHING;
";
