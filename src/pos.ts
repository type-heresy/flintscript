import { hash, is, ValueObject } from "immutable";

export default class Pos {
  protected constructor(
    protected _line?: number,
    protected _char?: number) { }

  copy(): this {
    return new Pos(this._line, this._char) as this;
  }

  line(): number | undefined
  line(n: number): this
  line(n: (n: number) => number): this
  line(n?: number | ((n: number) => number)): this | number | undefined {
    if (typeof n === "undefined") {
      return this._line;
    }
    let res = this.copy();
    if (n instanceof Function && typeof res._line !== "undefined") {
      res._line = n(res._line);
    }
    return res;
  }

  char(): number | undefined
  char(n: number): this
  char(n: (n: number) => number): this
  char(n?: number | ((n: number) => number)): this | number | undefined {
    if (typeof n === "undefined") {
      return this._char;
    }
    let res = this.copy();
    if (n instanceof Function && typeof res._char !== "undefined") {
      res._char = n(res._char);
    }
    return res;
  }
}
