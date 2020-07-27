import { hash, is, ValueObject } from "immutable";
import Pos from "./pos";

export default class Node<A> extends Pos implements ValueObject {
  constructor(
    protected _value: A,
    protected _line?: number,
    protected _char?: number) {
    super(_line, _char);
  }

  copy(): this {
    return new Node(this._value, this._line, this._char) as this;
  }

  equals(a: any): boolean {
    if (!(a instanceof Node)) return false;
    return is(this._value, a._value);
  }

  hashCode(): number {
    return Node.hashMerge(
      hash(this._value),
      Node.hashMerge(
        hash(this._line || 0),
        hash(this._char || 0)));
  }

  private static hashMerge(a: number, b: number): number {
    return (a ^ (b + 0x9e3779b9 + (a << 6) + (a >> 2))) | 0;
  }

  value(): A
  value(a: A): this;
  value(a: (a: A) => A): this;
  value(a?: A | ((a: A) => A)): A | this {
    if (typeof a === "undefined") return this._value
    let res = this.copy();
    if (a instanceof Function) {
      res._value = a(res._value)
    }
    else {
      res._value = a;
    }
    return res;
  }

  map<B>(f: (a: A) => B): Node<B> {
    return new Node(f(this._value), this._line, this._char);
  }
}
