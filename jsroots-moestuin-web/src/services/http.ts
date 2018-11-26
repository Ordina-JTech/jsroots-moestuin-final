import nanoajax from 'nanoajax';

export function get(url: string): Promise<any> {
  return promisify(nanoajax.ajax,[{ url }]);
}

export function getJSON(url: string): Promise<any> {
  return get(url).then((response) => JSON.parse(response));
}

function promisify(func: Function, args: any[], self: any = this): Promise<any> {
  return new Promise((resolve, reject) => {
    args.push((code: number, response: string, request: any) => {
      if (code.toString().startsWith('2')) {
        resolve(response);
      } else {
        reject(`ERROR ${code}: unable to query ${request.responseURL}.`);
      }
    });
    func.apply(self, args);
  });
}
