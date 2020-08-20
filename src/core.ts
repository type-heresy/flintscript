import { List, Map } from "immutable";


class Quote<S> {
  words: List<Word<S>>
}

class Identifier {
  name: string
  qualifier: string | undefined
}

class Exec<S> {
  apply: (state: S) => S
}

function isExec<S>(obj: any): obj is Exec<S> {
  return "apply" in obj;
}

type Word<S> = Exec<S> | Identifier;

interface Voc<S> {
  used: List<Voc<S>>
  required: Map<string, Voc<S>>

  resolve(ident: Identifier): Exec<S>
  direct(name: string): Exec<S> | null;
  use(voc: Voc<S>): Voc<S>
  require(qualifier: string, voc: Voc<S>): Voc<S>
  notFound(): Exec<S>
}

class Vocabular<S> implements Voc<S> {
  execs: Map<string, Exec<S>>
  required: Map<string, Voc<S>>
  used: List<Voc<S>>

  notFound(): Exec<S> {
    throw new Error("");
  }
  direct(name: string): Exec<S> | null {
    return this.execs.get(name, null);
  }

  resolve(ident: Identifier): Exec<S> {
    let reduceFn = (res: Exec<S> | undefined, voc: Voc<S>) => {
      if (res) return res;
      else return voc.direct(ident.name);;
    }
    if (ident.qualifier) {
      let voc = this.required.get(ident.qualifier)
      if (voc) return voc.direct(ident.name);
      else return this.notFound();
    }
    else {
      let res = this.used.reduce(reduceFn, this.direct(ident.name));
      if (res) return res;
      else return this.notFound();
    }
  }
  use(voc: Vocabular<S>): Vocabular<S> {
    let result = new Vocabular<S>();
    result.execs = this.execs;
    result.required = this.required;
    result.used = this.used.push(voc);
    return result;
  }
  require(qualifier: string, voc: Vocabular<S>): Vocabular<S> {
    let result = new Vocabular<S>();
    result.execs = this.execs;
    result.required = this.required.set(qualifier, voc);
    result.used = this.used;
    return result;
  }
  insert(name: string, quote: Quote<S>): Vocabular<S> {
    let result = new Vocabular<S>();
    result.used = this.used;
    result.required = this.required;
    let noop: Exec<S> = { apply(state: S): S { return state; } }
    let reducer = (acc: Exec<S>, word: Exec<S> | Identifier): Exec<S> => {
      return {
        apply: (s: S) => {
          if (isExec(word)) {
            return word.apply(acc.apply(s))
          } else {
            let found: Exec<S> | undefined = this.resolve(word);
            if (found) {
              return found.apply(acc.apply(s))
            } else {
              throw new Error("Word " + word.toString() + " is not found");
            }
          }
        }
      }
    };
    let exec = quote.words.reduce(reducer, noop);
    result.execs = this.execs.set(name, exec);
    return result;
  }
  static empty<S>(): Vocabular<S> {
    let res = new Vocabular<S>();
    res.execs = Map();
    res.required = Map();
    res.used = List();
    return res;
  }
  static noop<S>(): Vocabular<S> {
    let res = new Noop<S>();
    res.execs = Map();
    res.required = Map();
    res.used = List();
    return res;
  }
  static constant<S>(value: Exec<S>): Vocabular<S> {
    let res = new Const<S>(value);
    res.execs = Map();
    res.required = Map();
    res.used = List();
    return res;
  }
}

class Noop<S> extends Vocabular<S> {
  noop: Exec<S> = {
    apply: (s: S) => s
  }
  notFound(): Exec<S> {
    return this.noop;
  }
}

class Const<S> extends Vocabular<S> {
  value: Exec<S>;
  constructor(value: Exec<S>) {
    super();
    this.value = value;
  }
  notFound(): Exec<S> {
    return this.value;
  }
}

class JS implements Voc<List<any>> {
  used: List<Voc<List<any>>>
  required: Map<string, Voc<List<any>>>
  obj: any;

  notFound(): Exec<List<any>> {
    throw new Error("");
  }

  direct(name: string): Exec<List<any>> {
    let func: any = this.obj[name];
    if (typeof func === "function") {
      return {
        apply: (s: List<any>) => {
          let head = s.first();
          let tail = s.pop();
          if (List.isList(head)) {
            let args = head.toArray()
            return tail.push(func(...args));
          }
          else throw new Error("");
        }
      };
    }
    else throw new Error("")
  }
  resolve(ident: Identifier): Exec<List<any>> {
    let reduceFn = (res: Exec<List<any>> | undefined, voc: Voc<List<any>>) => {
      if (res) return res;
      else return voc.direct(ident.name);;
    }
    if (ident.qualifier) {
      let voc = this.required.get(ident.qualifier)
      if (voc) return voc.direct(ident.name);
      else return this.notFound();
    }
    else {
      let res = this.used.reduce(reduceFn, this.direct(ident.name));
      if (res) return res;
      else return this.notFound();
    }
  }

  use(voc: Voc<List<any>>): JS {
    let res = new JS();
    res.used = this.used.push(voc);
    res.required = this.required;
    res.obj = this.obj;
    return res;
  }
  require(qualifier: string, voc: Voc<List<any>>): JS {
    let res = new JS();
    res.used = this.used;
    res.obj = this.obj;
    res.required = this.required.set(qualifier, voc);
    return res;
  }
}
