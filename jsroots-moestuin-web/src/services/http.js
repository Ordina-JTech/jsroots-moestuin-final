import nanoajax from 'nanoajax';
export function get(url) {
    return promisify(nanoajax.ajax, [{ url }]);
}
export function getJSON(url) {
    return get(url).then((response) => JSON.parse(response));
}
function promisify(func, args, self = this) {
    return new Promise((resolve, reject) => {
        args.push((code, response, request) => {
            if (code.toString().startsWith('2')) {
                resolve(response);
            }
            else {
                reject(`ERROR ${code}: unable to query ${request.responseURL}.`);
            }
        });
        func.apply(self, args);
    });
}
