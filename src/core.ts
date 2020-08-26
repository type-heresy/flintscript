import { List, Map } from "immutable";

// Everything is a word
interface Word {
  read(book: Book): Book
}

// Either identifier in the form of foo/bar/baz evaluating to morphism on top of Book
// or identifier in the form :foo/bar/baz evaluating to foo/bar/baz
class Rune implements Word {
  word: string
  // moves this identifier in the context of `r`
  weave(r: Rune) {
    let res = new Rune();
    res.word = r.word + "/" + this.word;
    return res;
  }
  readGlyph(): undefined | Rune {
    if (this.word[0] === ":") {
      let res = new Rune();
      res.word = this.word.slice(1);
      return res;
    }
  }
  readLine(): undefined | number {
    if (this.word[0] === "@") {
      let sliced = this.word.slice(1);
      let mbLine = parseInt(sliced)
      if (mbLine.toString() === sliced) {
        return mbLine;
      }
    }
  }
  read(b: Book) {
    let line = this.readLine();
    if (line) {
      let v: Word | undefined = b.chants.get(line)
      if (v) {
        let bb = new Book();
        bb.chapters = b.chapters;
        bb.chants = b.chants.push(v);
        bb.references = b.references;
        return bb;
      } else {
        throw new Error("")
      }
    }
    let glyph = this.readGlyph();
    if (glyph) {
      let bb = new Book();
      bb.chapters = b.chapters;
      bb.chants = b.chants.push(glyph);
      bb.references = b.references;
      return bb;
    } else {
      let spell = b.getRune(this);
      if (!spell) {
        throw new Error("");
      } else {
        return spell.read(b);
      }
    }
  }
}

// Stack in the form [ foo bar baz ], all identifiers are effectively quoted
class Script implements Word {
  chants: List<Word>

  read(b: Book): Book {
    let hd: Word | undefined = this.chants.first(undefined);
    // When a rune is sitting on top of stack we
    if (hd instanceof Rune) {
      // compile the script to a spell in the context of current book
      // E.g. :foo [ 2 ] :bar [ foo dup + ] is the same as :bar [ 4 ]
      let chant = function(_book: Book) {
        return this.chant(b);
      };
      let spell = new Spell();
      spell.chant = chant;
      let bb = new Book();
      bb.chants = b.chants;
      bb.references = b.references;
      // and insert the spell into vocabular
      bb.chapters = b.chapters.set(hd, spell);
      return bb;
    } else if (hd instanceof Book) {
      let mantra = Mantra.fromScript(this);
      return mantra.read(hd.use(b));
    } else {
      // otherwise just
      let bb = new Book();
      bb.chants = bb.chants.push(this);
      return bb;
    }
  }
  // In context of this book produce a book morphism
  chant(b: Book): (inp: Book) => Book {
    return (inp: Book) => {
      let chants = this.chants;
      let chant: Word | undefined = chants.first(undefined);
      let res = inp;
      while (chant) {
        if (chant instanceof Rune) {
          let spell = b.getRune(chant);
          res = spell.read(res);
        } else {
          res = chant.read(res);
        }
        chants = this.chants.pop();
        chant = chants.first(undefined);
      }
      return res;
    }
  }
}
// Somewhat like lambda builder in the form of [< foo bar baz >]. It encloses identifiers in the moment of
// definition. So, `:foo [ 2 ] :bar [< foo + >] :foo [ 4 ] 12 bar` will put on stack 14, not 16
class Mantra implements Word {
  chants: List<Word>
  script(): Script {
    let res = new Script();
    res.chants = this.chants;
    return res;
  }
  read(b: Book) {
    // compile content down to current closures
    let spell = new Spell();
    spell.chant = this.script().chant(b);
    // put the spell into the book
    let res = new Book();
    res.chants = b.chants.push(spell);
    res.chapters = b.chapters;
    res.references = b.references;
    return res;
  }
  static fromScript(script: Script): Mantra {
    let res = new Mantra();
    res.chants = script.chants;
    return res;
  }
}

// Somewhat like book literal, [- 185 :name [ 12 ] -] will put on stack a book with chants List(185) and chapters Map(name -> 12)
class Chapters extends Mantra {
  chants: List<Word>

  read(inp: Book): Book {
    // create an empty book
    let emptyBook = new Book();
    emptyBook.chants = List();
    emptyBook.chapters = Map();
    emptyBook.references = List();
    // and cast a chant on it with context of current input
    let res = this.script().chant(inp)(emptyBook);
    // then just read this book
    return res.read(inp);
  }
}

// A lambda aka book morphism.
class Spell implements Word {
  chant(inp: Book): Book {
    return inp;
  }
  read(inp: Book): Book {
    return this.chant(inp);
  }
}


// Stackabular, stacktionary... the main datastructure here.
class Book extends Script {
  // if we can't find a spell in this book, we can try other books
  references: List<Book>
  // runic spells location
  chapters: Map<Rune, Spell>
  // stack, for various stateful fancinesses
  chants: List<Word>
  // add this book to references
  use(book: Book): Book {
    let res = new Book();
    res.chapters = this.chapters;
    res.chants = this.chants;
    res.references = this.references.push(book);
    return res;
  }
  // qualified require
  weaved(r: Rune): Book {
    let res = new Book();
    let reduceFn = (m: Map<Rune, Spell>, v: Spell, k: Rune) => m.set(k.weave(r), v);
    res.chapters = this.chapters.reduce<Map<Rune, Spell>>(reduceFn, Map())
    res.chants = this.chants;
    res.references = List();
    return res;
  }
  // lookup for spell only in this namespace
  getSelf(rune: Rune): Spell | undefined {
    return this.chapters.get(rune);
  }
  // lookup for spell in all namespaces
  getRune(rune: Rune): Spell | undefined {
    let self = this.getSelf(rune);
    if (self) return self
    else {
      let reducer = (r: Spell | undefined, b: Book) => {
        if (r) return r;
        else {
          return b.getSelf(rune);
        }
      }
      return this.references.reduce<Spell | undefined>(reducer, undefined);
    }
  }
  // There is no vocabular literal but builder in the form [- ... -]
  // which will apply a quotation to empty book and then call `read`
  read(inp: Book): Book {
    let hd: Word | undefined = inp.chants.first<Word | undefined>(undefined);
    // if on top of stack is lying a book, use it as a reference
    if (hd instanceof Book) {
      let newBook = this.use(hd);
      let res = new Book();
      res.chapters = inp.chapters;
      res.chants = inp.chants.pop().push(newBook);
      res.references = inp.references;
      return res;
    }
    // If we put book on top of script, we convert the script into lambda and delegate reading to it
    else if (hd instanceof Script) {
      let mantra = Mantra.fromScript(hd);
      return mantra.read(this.use(inp));
    }
    // if there is a rune - qualify this stack
    else if (hd instanceof Rune) {
      let newBook = this.weaved(hd);
      return newBook.read(inp);
    }
    else {
      let res = new Book();
      res.chapters = inp.chapters;
      res.chants = inp.chants.push(this);
      res.references = inp.references;
      return res;
    }
  }
}
