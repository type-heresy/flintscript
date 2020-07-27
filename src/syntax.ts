import { List, Map } from "immutable";
import Node from "./node";

export class Literal extends Node<any> {
  tag: "literal" = "literal";
}
export class Quote extends Node<List<Syntax>> {
  tag: "quote" = "quote";
}
export class Fn extends Node<StateHomomorphism> {
  tag: "exec" = "exec";
}
export class Ref extends Node<Identifier> {
  tag: "ref" = "ref";

  static parse(s: Node<string>): Ref {
    let els = s.value().split(Ref.namespaceSeparator);
    return new Ref(List(els), s.line(), s.char());
  }
  static namespaceSeparator: string = ":"

  static empty: Ref = new Ref(List())
}

export type Identifier = List<string>;
export type Voc = Map<Identifier, (Fn | Quote)>
export type Syntax = Literal | Quote | Fn | Ref

export type State = {
  stack: List<any>,
  words: List<Syntax>,
  voc: Voc
}
export type StateHomomorphism = (state: State) => State;
