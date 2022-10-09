import { isSome, none, Option, some } from "fp-ts/Option";

const findIndex = <T>(
  list: Array<T>,
  predicate: (val: T) => boolean
): Option<number> => {
  const index = list.findIndex(predicate);
  return index < 0 ? none : some(index)
};

const phones = ["iPhone", "BlackBerry"];
const iPhoneIndex = findIndex(phones, (name) => name === "iPhone");

if(isSome(iPhoneIndex)) {
  console.log('iPhoneIndex: ', iPhoneIndex.value)
}