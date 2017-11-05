export function mapToObject(map: Map<string | number, any>) {
  const obj = {};
  map.forEach((value, key) => {
    Object.assign(obj, {
      [key]: value
    });
  });
  return obj;
}
