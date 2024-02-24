import { Contributor } from '../types';

class API_CLASS {
  private BASE_PATH = '/data';

  private async handleErrors(res: Response) {
    if (!res.ok) {
      const text = await res.json();
      throw {
        kind: 'error',
        message: text.message !== '' ? text.message : undefined,
      };
    }
    return res;
  }

  private async handleContent(res: Response) {
    let data;

    switch (res.headers.get('Content-Type')) {
      case 'text/html':
        return null;
      case 'application/json':
        data = await res.json();
        return data;
      default:
        return null;
    }
  }

  public async apiFetch(url: string) {
    return fetch(url)
      .then(this.handleErrors)
      .then((res) => this.handleContent(res))
      .catch((error) => Promise.reject(error));
  }

  public getContributorInfo(id: string): Promise<Contributor> {
    return this.apiFetch(
      `${import.meta.env.MODE === 'development' ? `/static${this.BASE_PATH}/` : this.BASE_PATH}/${id}.json`
    );
  }
}

const API = new API_CLASS();
export default API;
