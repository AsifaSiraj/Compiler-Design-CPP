// ============================================================
//  ABC Tech Lightweight Compiler — Full Pipeline
//  Phases: Lexer → Parser → Semantic → IR Gen → VM Exec
// ============================================================

// ─────────────────────────────────────────────────────────────
// PHASE 1: LEXER (Lexical Analysis)
// ─────────────────────────────────────────────────────────────
const TokenType = {
  // Literals
  INT_LITERAL: 'INT_LITERAL',
  BOOL_LITERAL: 'BOOL_LITERAL',
  STRING_LITERAL: 'STRING_LITERAL',
  // Types
  INT: 'int',
  BOOL: 'bool',
  VOID: 'void',
  // Keywords
  IF: 'if', ELSE: 'else', WHILE: 'while', FOR: 'for',
  RETURN: 'return', BREAK: 'break', CONTINUE: 'continue',
  PRINT: 'print', INPUT: 'input', TRUE: 'true', FALSE: 'false',
  // Identifiers
  IDENTIFIER: 'IDENTIFIER',
  // Operators
  PLUS: '+', MINUS: '-', STAR: '*', SLASH: '/', PERCENT: '%',
  ASSIGN: '=',
  EQ: '==', NEQ: '!=', LT: '<', GT: '>', LTE: '<=', GTE: '>=',
  AND: '&&', OR: '||', NOT: '!',
  // Delimiters
  LPAREN: '(', RPAREN: ')', LBRACE: '{', RBRACE: '}',
  SEMICOLON: ';', COMMA: ',',
  // Special
  EOF: 'EOF',
};

const KEYWORDS = {
  int: TokenType.INT, bool: TokenType.BOOL, void: TokenType.VOID,
  if: TokenType.IF, else: TokenType.ELSE, while: TokenType.WHILE,
  for: TokenType.FOR, return: TokenType.RETURN, break: TokenType.BREAK,
  continue: TokenType.CONTINUE, print: TokenType.PRINT,
  input: TokenType.INPUT, true: TokenType.TRUE, false: TokenType.FALSE,
};

class Token {
  constructor(type, value, line, col) {
    this.type = type; this.value = value;
    this.line = line; this.col = col;
  }
  toString() { return `Token(${this.type}, ${JSON.stringify(this.value)}, L${this.line}:C${this.col})`; }
}

class LexerError extends Error {
  constructor(msg, line, col) {
    super(msg); this.line = line; this.col = col; this.phase = 'Lexer';
  }
}

class Lexer {
  constructor(source) {
    this.source = source; this.pos = 0;
    this.line = 1; this.col = 1;
    this.tokens = [];
  }

  error(msg) { throw new LexerError(msg, this.line, this.col); }
  peek(offset = 0) { return this.source[this.pos + offset] || ''; }
  advance() {
    const ch = this.source[this.pos++];
    if (ch === '\n') { this.line++; this.col = 1; } else { this.col++; }
    return ch;
  }

  match(ch) { if (this.peek() === ch) { this.advance(); return true; } return false; }

  skipWhitespaceAndComments() {
    while (this.pos < this.source.length) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.advance();
      } else if (ch === '/' && this.peek(1) === '/') {
        while (this.pos < this.source.length && this.peek() !== '\n') this.advance();
      } else if (ch === '/' && this.peek(1) === '*') {
        this.advance(); this.advance();
        while (this.pos < this.source.length) {
          if (this.peek() === '*' && this.peek(1) === '/') { this.advance(); this.advance(); break; }
          this.advance();
        }
      } else break;
    }
  }

  readNumber() {
    const startLine = this.line, startCol = this.col;
    let num = '';
    while (this.pos < this.source.length && /\d/.test(this.peek())) num += this.advance();
    return new Token(TokenType.INT_LITERAL, parseInt(num, 10), startLine, startCol);
  }

  readIdentOrKeyword() {
    const startLine = this.line, startCol = this.col;
    let id = '';
    while (this.pos < this.source.length && /[a-zA-Z0-9_]/.test(this.peek())) id += this.advance();
    const type = KEYWORDS[id] || TokenType.IDENTIFIER;
    const value = type === TokenType.TRUE ? true : type === TokenType.FALSE ? false : id;
    return new Token(type, value, startLine, startCol);
  }

  readString() {
    const startLine = this.line, startCol = this.col;
    this.advance(); // opening "
    let str = '';
    while (this.pos < this.source.length && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const esc = this.advance();
        str += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
      } else str += this.advance();
    }
    if (this.pos >= this.source.length) this.error('Unterminated string literal');
    this.advance(); // closing "
    return new Token(TokenType.STRING_LITERAL, str, startLine, startCol);
  }

  tokenize() {
    while (true) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length) {
        this.tokens.push(new Token(TokenType.EOF, null, this.line, this.col));
        break;
      }
      const startLine = this.line, startCol = this.col;
      const ch = this.peek();

      if (/\d/.test(ch)) { this.tokens.push(this.readNumber()); continue; }
      if (/[a-zA-Z_]/.test(ch)) { this.tokens.push(this.readIdentOrKeyword()); continue; }
      if (ch === '"') { this.tokens.push(this.readString()); continue; }

      this.advance();
      let tok;
      switch (ch) {
        case '+': tok = new Token(TokenType.PLUS, '+', startLine, startCol); break;
        case '-': tok = new Token(TokenType.MINUS, '-', startLine, startCol); break;
        case '*': tok = new Token(TokenType.STAR, '*', startLine, startCol); break;
        case '/': tok = new Token(TokenType.SLASH, '/', startLine, startCol); break;
        case '%': tok = new Token(TokenType.PERCENT, '%', startLine, startCol); break;
        case '=': tok = new Token(this.match('=') ? TokenType.EQ : TokenType.ASSIGN, this.match('=') ? '==' : '=', startLine, startCol);
          if (tok.type === TokenType.ASSIGN && this.source[this.pos-1] === '=') tok = new Token(TokenType.EQ, '==', startLine, startCol);
          else tok = new Token(this.source[this.pos-1] === '=' ? TokenType.ASSIGN : TokenType.ASSIGN, '=', startLine, startCol);
          // redo cleanly:
          { const wasEq = this.pos > 1 && this.source[this.pos-1] === '=';
            tok = wasEq ? new Token(TokenType.EQ,'==',startLine,startCol) : new Token(TokenType.ASSIGN,'=',startLine,startCol); }
          break;
        case '!': tok = new Token(this.match('=') ? TokenType.NEQ : TokenType.NOT, this.peek(-1)==='=' ? '!=' : '!', startLine, startCol);
          { const p = this.source[this.pos-1]; tok = new Token(p==='=' ? TokenType.NEQ : TokenType.NOT, p==='='?'!=':'!', startLine, startCol); }
          break;
        case '<': tok = new Token(this.match('=') ? TokenType.LTE : TokenType.LT, this.source[this.pos-1]==='='?'<=':'<', startLine, startCol);
          { const p = this.source[this.pos-1]; tok = new Token(p==='='?TokenType.LTE:TokenType.LT, p==='='?'<=':'<', startLine, startCol); }
          break;
        case '>': tok = new Token(this.match('=') ? TokenType.GTE : TokenType.GT, this.source[this.pos-1]==='='?'>=':'>', startLine, startCol);
          { const p = this.source[this.pos-1]; tok = new Token(p==='='?TokenType.GTE:TokenType.GT, p==='='?'>=':'>', startLine, startCol); }
          break;
        case '&': if (this.match('&')) tok = new Token(TokenType.AND,'&&',startLine,startCol); else this.error(`Unexpected char '&', did you mean '&&'?`); break;
        case '|': if (this.match('|')) tok = new Token(TokenType.OR,'||',startLine,startCol); else this.error(`Unexpected char '|', did you mean '||'?`); break;
        case '(': tok = new Token(TokenType.LPAREN,'(',startLine,startCol); break;
        case ')': tok = new Token(TokenType.RPAREN,')',startLine,startCol); break;
        case '{': tok = new Token(TokenType.LBRACE,'{',startLine,startCol); break;
        case '}': tok = new Token(TokenType.RBRACE,'}',startLine,startCol); break;
        case ';': tok = new Token(TokenType.SEMICOLON,';',startLine,startCol); break;
        case ',': tok = new Token(TokenType.COMMA,',',startLine,startCol); break;
        default: this.error(`Unknown character '${ch}'`);
      }
      if (tok) this.tokens.push(tok);
    }
    return this.tokens;
  }
}

// Fix the messy switch — cleaner re-implementation
class CleanLexer extends Lexer {
  tokenize() {
    while (true) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length) {
        this.tokens.push(new Token(TokenType.EOF, null, this.line, this.col));
        break;
      }
      const sl = this.line, sc = this.col, ch = this.peek();
      if (/\d/.test(ch)) { this.tokens.push(this.readNumber()); continue; }
      if (/[a-zA-Z_]/.test(ch)) { this.tokens.push(this.readIdentOrKeyword()); continue; }
      if (ch === '"') { this.tokens.push(this.readString()); continue; }
      this.advance();
      const mk = (t,v) => new Token(t,v,sl,sc);
      let tok;
      switch(ch) {
        case '+': tok=mk(TokenType.PLUS,'+'); break;
        case '-': tok=mk(TokenType.MINUS,'-'); break;
        case '*': tok=mk(TokenType.STAR,'*'); break;
        case '/': tok=mk(TokenType.SLASH,'/'); break;
        case '%': tok=mk(TokenType.PERCENT,'%'); break;
        case '=': tok=this.match('=')?mk(TokenType.EQ,'=='):mk(TokenType.ASSIGN,'='); break;
        case '!': tok=this.match('=')?mk(TokenType.NEQ,'!='):mk(TokenType.NOT,'!'); break;
        case '<': tok=this.match('=')?mk(TokenType.LTE,'<='):mk(TokenType.LT,'<'); break;
        case '>': tok=this.match('=')?mk(TokenType.GTE,'>='):mk(TokenType.GT,'>'); break;
        case '&': if(this.match('&'))tok=mk(TokenType.AND,'&&'); else this.error("Expected '&&'"); break;
        case '|': if(this.match('|'))tok=mk(TokenType.OR,'||'); else this.error("Expected '||'"); break;
        case '(': tok=mk(TokenType.LPAREN,'('); break;
        case ')': tok=mk(TokenType.RPAREN,')'); break;
        case '{': tok=mk(TokenType.LBRACE,'{'); break;
        case '}': tok=mk(TokenType.RBRACE,'}'); break;
        case ';': tok=mk(TokenType.SEMICOLON,';'); break;
        case ',': tok=mk(TokenType.COMMA,','); break;
        default: this.error(`Unknown character '${ch}'`);
      }
      if(tok) this.tokens.push(tok);
    }
    return this.tokens;
  }
}

// ─────────────────────────────────────────────────────────────
// PHASE 2: AST NODE DEFINITIONS
// ─────────────────────────────────────────────────────────────
class ASTNode { constructor(type,line){this.type=type;this.line=line;} }
class ProgramNode extends ASTNode { constructor(decls,line){super('Program',line);this.declarations=decls;} }
class VarDeclNode extends ASTNode { constructor(varType,name,init,line){super('VarDecl',line);this.varType=varType;this.name=name;this.init=init;} }
class FuncDeclNode extends ASTNode { constructor(retType,name,params,body,line){super('FuncDecl',line);this.retType=retType;this.name=name;this.params=params;this.body=body;} }
class BlockNode extends ASTNode { constructor(stmts,line){super('Block',line);this.statements=stmts;} }
class IfNode extends ASTNode { constructor(cond,then,els,line){super('If',line);this.condition=cond;this.thenBranch=then;this.elseBranch=els;} }
class WhileNode extends ASTNode { constructor(cond,body,line){super('While',line);this.condition=cond;this.body=body;} }
class ForNode extends ASTNode { constructor(init,cond,incr,body,line){super('For',line);this.init=init;this.condition=cond;this.increment=incr;this.body=body;} }
class ReturnNode extends ASTNode { constructor(val,line){super('Return',line);this.value=val;} }
class BreakNode extends ASTNode { constructor(line){super('Break',line);} }
class ContinueNode extends ASTNode { constructor(line){super('Continue',line);} }
class PrintNode extends ASTNode { constructor(args,line){super('Print',line);this.args=args;} }
class ExprStmtNode extends ASTNode { constructor(expr,line){super('ExprStmt',line);this.expression=expr;} }
class AssignNode extends ASTNode { constructor(name,val,line){super('Assign',line);this.name=name;this.value=val;} }
class BinOpNode extends ASTNode { constructor(op,left,right,line){super('BinOp',line);this.op=op;this.left=left;this.right=right;} }
class UnaryNode extends ASTNode { constructor(op,expr,line){super('Unary',line);this.op=op;this.expr=expr;} }
class CallNode extends ASTNode { constructor(name,args,line){super('Call',line);this.name=name;this.args=args;} }
class VarNode extends ASTNode { constructor(name,line){super('Var',line);this.name=name;} }
class IntLitNode extends ASTNode { constructor(val,line){super('IntLit',line);this.value=val;} }
class BoolLitNode extends ASTNode { constructor(val,line){super('BoolLit',line);this.value=val;} }
class StringLitNode extends ASTNode { constructor(val,line){super('StringLit',line);this.value=val;} }

// ─────────────────────────────────────────────────────────────
// PHASE 2: PARSER (Syntax Analysis) — Recursive Descent
// ─────────────────────────────────────────────────────────────
class ParseError extends Error {
  constructor(msg,token){super(msg);this.token=token;this.phase='Parser';this.line=token?.line;this.col=token?.col;}
}

class Parser {
  constructor(tokens){ this.tokens=tokens; this.pos=0; }
  peek(){ return this.tokens[this.pos]; }
  prev(){ return this.tokens[this.pos-1]; }
  isAtEnd(){ return this.peek().type===TokenType.EOF; }
  advance(){ if(!this.isAtEnd())this.pos++; return this.prev(); }
  check(type){ return this.peek().type===type; }
  match(...types){ for(const t of types){if(this.check(t)){this.advance();return true;}} return false; }
  consume(type,msg){ if(this.check(type))return this.advance(); throw new ParseError(`${msg} — got '${this.peek().value??this.peek().type}' at line ${this.peek().line}`,this.peek()); }

  parse(){
    const decls=[], line=this.peek().line;
    while(!this.isAtEnd()) decls.push(this.parseDeclaration());
    return new ProgramNode(decls,line);
  }

  parseDeclaration(){
    const tok=this.peek();
    if(this.isType()) return this.parseTypedDecl();
    return this.parseStatement();
  }

  isType(){ return [TokenType.INT,TokenType.BOOL,TokenType.VOID].includes(this.peek().type); }

  parseTypedDecl(){
    const typeTok=this.advance(), line=typeTok.line;
    const name=this.consume(TokenType.IDENTIFIER,`Expected identifier after '${typeTok.value}'`).value;
    // Function declaration
    if(this.check(TokenType.LPAREN)){
      this.advance();
      const params=[];
      if(!this.check(TokenType.RPAREN)){
        do {
          const pt=this.advance(); // type
          const pn=this.consume(TokenType.IDENTIFIER,'Expected parameter name').value;
          params.push({type:pt.value,name:pn});
        } while(this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN,"Expected ')' after parameters");
      const body=this.parseBlock();
      return new FuncDeclNode(typeTok.value,name,params,body,line);
    }
    // Variable declaration
    let init=null;
    if(this.match(TokenType.ASSIGN)) init=this.parseExpr();
    this.consume(TokenType.SEMICOLON,"Expected ';' after variable declaration");
    return new VarDeclNode(typeTok.value,name,init,line);
  }

  parseBlock(){
    const line=this.peek().line;
    this.consume(TokenType.LBRACE,"Expected '{'");
    const stmts=[];
    while(!this.check(TokenType.RBRACE)&&!this.isAtEnd()) stmts.push(this.parseDeclaration());
    this.consume(TokenType.RBRACE,"Expected '}'");
    return new BlockNode(stmts,line);
  }

  parseStatement(){
    const tok=this.peek();
    if(this.match(TokenType.IF)) return this.parseIf(tok.line);
    if(this.match(TokenType.WHILE)) return this.parseWhile(tok.line);
    if(this.match(TokenType.FOR)) return this.parseFor(tok.line);
    if(this.match(TokenType.RETURN)) return this.parseReturn(tok.line);
    if(this.match(TokenType.BREAK)){ this.consume(TokenType.SEMICOLON,"Expected ';'"); return new BreakNode(tok.line); }
    if(this.match(TokenType.CONTINUE)){ this.consume(TokenType.SEMICOLON,"Expected ';'"); return new ContinueNode(tok.line); }
    if(this.match(TokenType.PRINT)) return this.parsePrint(tok.line);
    if(this.check(TokenType.LBRACE)) return this.parseBlock();
    return this.parseExprStmt();
  }

  parseIf(line){
    this.consume(TokenType.LPAREN,"Expected '(' after 'if'");
    const cond=this.parseExpr();
    this.consume(TokenType.RPAREN,"Expected ')' after if condition");
    const then=this.parseStatement();
    let els=null;
    if(this.match(TokenType.ELSE)) els=this.parseStatement();
    return new IfNode(cond,then,els,line);
  }

  parseWhile(line){
    this.consume(TokenType.LPAREN,"Expected '(' after 'while'");
    const cond=this.parseExpr();
    this.consume(TokenType.RPAREN,"Expected ')' after while condition");
    const body=this.parseStatement();
    return new WhileNode(cond,body,line);
  }

  parseFor(line){
    this.consume(TokenType.LPAREN,"Expected '(' after 'for'");
    let init=null;
    if(!this.check(TokenType.SEMICOLON)){
      if(this.isType()) init=this.parseTypedDecl();
      else init=this.parseExprStmt();
    } else this.advance();
    let cond=null;
    if(!this.check(TokenType.SEMICOLON)) cond=this.parseExpr();
    this.consume(TokenType.SEMICOLON,"Expected ';' in for");
    let incr=null;
    if(!this.check(TokenType.RPAREN)) incr=this.parseExpr();
    this.consume(TokenType.RPAREN,"Expected ')' after for clauses");
    const body=this.parseStatement();
    return new ForNode(init,cond,incr,body,line);
  }

  parseReturn(line){
    let val=null;
    if(!this.check(TokenType.SEMICOLON)) val=this.parseExpr();
    this.consume(TokenType.SEMICOLON,"Expected ';' after return");
    return new ReturnNode(val,line);
  }

  parsePrint(line){
    this.consume(TokenType.LPAREN,"Expected '(' after 'print'");
    const args=[];
    if(!this.check(TokenType.RPAREN)){
      do { args.push(this.parseExpr()); } while(this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN,"Expected ')' after print args");
    this.consume(TokenType.SEMICOLON,"Expected ';' after print");
    return new PrintNode(args,line);
  }

  parseExprStmt(){
    const line=this.peek().line;
    const expr=this.parseExpr();
    this.consume(TokenType.SEMICOLON,"Expected ';' after expression");
    return new ExprStmtNode(expr,line);
  }

  parseExpr(){ return this.parseAssign(); }

  parseAssign(){
    let expr=this.parseOr();
    if(this.match(TokenType.ASSIGN)){
      const line=this.prev().line;
      if(expr.type!=='Var') throw new ParseError('Invalid assignment target',this.prev());
      const val=this.parseAssign();
      return new AssignNode(expr.name,val,line);
    }
    return expr;
  }

  parseOr(){
    let left=this.parseAnd();
    while(this.match(TokenType.OR)){ const line=this.prev().line; left=new BinOpNode('||',left,this.parseAnd(),line); }
    return left;
  }
  parseAnd(){
    let left=this.parseEquality();
    while(this.match(TokenType.AND)){ const line=this.prev().line; left=new BinOpNode('&&',left,this.parseEquality(),line); }
    return left;
  }
  parseEquality(){
    let left=this.parseRelational();
    while(this.match(TokenType.EQ,TokenType.NEQ)){ const op=this.prev().value,line=this.prev().line; left=new BinOpNode(op,left,this.parseRelational(),line); }
    return left;
  }
  parseRelational(){
    let left=this.parseAddSub();
    while(this.match(TokenType.LT,TokenType.GT,TokenType.LTE,TokenType.GTE)){ const op=this.prev().value,line=this.prev().line; left=new BinOpNode(op,left,this.parseAddSub(),line); }
    return left;
  }
  parseAddSub(){
    let left=this.parseMulDiv();
    while(this.match(TokenType.PLUS,TokenType.MINUS)){ const op=this.prev().value,line=this.prev().line; left=new BinOpNode(op,left,this.parseMulDiv(),line); }
    return left;
  }
  parseMulDiv(){
    let left=this.parseUnary();
    while(this.match(TokenType.STAR,TokenType.SLASH,TokenType.PERCENT)){ const op=this.prev().value,line=this.prev().line; left=new BinOpNode(op,left,this.parseUnary(),line); }
    return left;
  }
  parseUnary(){
    if(this.match(TokenType.NOT,TokenType.MINUS)){ const op=this.prev().value,line=this.prev().line; return new UnaryNode(op,this.parseUnary(),line); }
    return this.parsePrimary();
  }
  parsePrimary(){
    const tok=this.peek(), line=tok.line;
    if(this.match(TokenType.INT_LITERAL)) return new IntLitNode(this.prev().value,line);
    if(this.match(TokenType.TRUE)) return new BoolLitNode(true,line);
    if(this.match(TokenType.FALSE)) return new BoolLitNode(false,line);
    if(this.match(TokenType.STRING_LITERAL)) return new StringLitNode(this.prev().value,line);
    if(this.match(TokenType.IDENTIFIER)){
      const name=this.prev().value;
      if(this.match(TokenType.LPAREN)){
        const args=[];
        if(!this.check(TokenType.RPAREN)) do { args.push(this.parseExpr()); } while(this.match(TokenType.COMMA));
        this.consume(TokenType.RPAREN,"Expected ')' after arguments");
        return new CallNode(name,args,line);
      }
      return new VarNode(name,line);
    }
    if(this.match(TokenType.LPAREN)){
      const expr=this.parseExpr();
      this.consume(TokenType.RPAREN,"Expected ')'");
      return expr;
    }
    throw new ParseError(`Unexpected token '${tok.value??tok.type}'`,tok);
  }
}

// ─────────────────────────────────────────────────────────────
// PHASE 3: SEMANTIC ANALYZER
// ─────────────────────────────────────────────────────────────
class SemanticError extends Error {
  constructor(msg,line){ super(msg); this.line=line; this.phase='Semantic'; }
}

class SymbolTable {
  constructor(parent=null){ this.parent=parent; this.table={}; }
  define(name,info){ this.table[name]=info; }
  lookup(name){ return this.table[name]||(this.parent?this.parent.lookup(name):null); }
  has(name){ return name in this.table; }
}

class SemanticAnalyzer {
  constructor(){ this.scope=new SymbolTable(); this.currentFunc=null; this.loopDepth=0; this.errors=[]; }

  error(msg,line){ this.errors.push(new SemanticError(msg,line)); }

  pushScope(){ this.scope=new SymbolTable(this.scope); }
  popScope(){ this.scope=this.scope.parent; }

  analyze(node){
    if(!node) return 'void';
    switch(node.type){
      case 'Program': node.declarations.forEach(d=>this.analyze(d)); break;
      case 'VarDecl': return this.analyzeVarDecl(node);
      case 'FuncDecl': return this.analyzeFuncDecl(node);
      case 'Block': this.pushScope(); node.statements.forEach(s=>this.analyze(s)); this.popScope(); break;
      case 'If': {
        const ct=this.analyze(node.condition);
        if(ct!=='bool'&&ct!=='int') this.error('If condition must be bool or int',node.line);
        this.analyze(node.thenBranch); if(node.elseBranch) this.analyze(node.elseBranch); break;
      }
      case 'While': {
        const ct=this.analyze(node.condition);
        if(ct!=='bool'&&ct!=='int') this.error('While condition must be bool or int',node.line);
        this.loopDepth++; this.analyze(node.body); this.loopDepth--; break;
      }
      case 'For': {
        this.pushScope();
        if(node.init) this.analyze(node.init);
        if(node.condition) this.analyze(node.condition);
        if(node.increment) this.analyze(node.increment);
        this.loopDepth++; this.analyze(node.body); this.loopDepth--;
        this.popScope(); break;
      }
      case 'Return': {
        if(!this.currentFunc) this.error('Return outside function',node.line);
        const vt=node.value?this.analyze(node.value):'void';
        if(this.currentFunc&&vt!==this.currentFunc.retType&&!(this.currentFunc.retType==='int'&&vt==='bool'))
          this.error(`Return type mismatch: expected '${this.currentFunc.retType}', got '${vt}'`,node.line);
        break;
      }
      case 'Break': if(this.loopDepth===0) this.error("'break' outside loop",node.line); break;
      case 'Continue': if(this.loopDepth===0) this.error("'continue' outside loop",node.line); break;
      case 'Print': node.args.forEach(a=>this.analyze(a)); break;
      case 'ExprStmt': return this.analyze(node.expression);
      case 'Assign': return this.analyzeAssign(node);
      case 'BinOp': return this.analyzeBinOp(node);
      case 'Unary': return this.analyzeUnary(node);
      case 'Call': return this.analyzeCall(node);
      case 'Var': {
        const sym=this.scope.lookup(node.name);
        if(!sym) this.error(`Undeclared variable '${node.name}'`,node.line);
        return sym?.varType||'int';
      }
      case 'IntLit': return 'int';
      case 'BoolLit': return 'bool';
      case 'StringLit': return 'string';
    }
    return 'void';
  }

  analyzeVarDecl(node){
    if(this.scope.has(node.name)) this.error(`Variable '${node.name}' already declared in this scope`,node.line);
    if(node.init){
      const it=this.analyze(node.init);
      if(it!==node.varType&&!(node.varType==='int'&&it==='bool')&&it!=='unknown')
        this.error(`Cannot assign '${it}' to variable of type '${node.varType}'`,node.line);
    }
    this.scope.define(node.name,{varType:node.varType,kind:'var'});
    return node.varType;
  }

  analyzeFuncDecl(node){
    if(this.scope.has(node.name)) this.error(`Function '${node.name}' already declared`,node.line);
    this.scope.define(node.name,{varType:node.retType,kind:'func',params:node.params});
    const prev=this.currentFunc; this.currentFunc={retType:node.retType,name:node.name};
    this.pushScope();
    node.params.forEach(p=>this.scope.define(p.name,{varType:p.type,kind:'param'}));
    this.analyze(node.body);
    this.popScope(); this.currentFunc=prev;
  }

  analyzeAssign(node){
    const sym=this.scope.lookup(node.name);
    if(!sym) this.error(`Undeclared variable '${node.name}'`,node.line);
    const vt=this.analyze(node.value);
    if(sym&&vt!==sym.varType&&!(sym.varType==='int'&&vt==='bool')&&vt!=='unknown')
      this.error(`Cannot assign '${vt}' to '${node.name}' (type '${sym.varType}')`,node.line);
    return sym?.varType||'int';
  }

  analyzeBinOp(node){
    const lt=this.analyze(node.left), rt=this.analyze(node.right);
    const arith=['+','-','*','/','%'];
    const cmp=['<','>','<=','>='];
    const eq=['==','!='];
    const logic=['&&','||'];
    if(arith.includes(node.op)){ if(lt!=='int'||rt!=='int') this.error(`Arithmetic op '${node.op}' requires int operands`,node.line); return 'int'; }
    if(cmp.includes(node.op)){ if(lt!=='int'||rt!=='int') this.error(`Comparison '${node.op}' requires int operands`,node.line); return 'bool'; }
    if(eq.includes(node.op)){ if(lt!==rt) this.error(`Equality '${node.op}' on mismatched types '${lt}' and '${rt}'`,node.line); return 'bool'; }
    if(logic.includes(node.op)) return 'bool';
    return 'unknown';
  }

  analyzeUnary(node){
    const t=this.analyze(node.expr);
    if(node.op==='-'&&t!=='int') this.error("Unary '-' requires int",node.line);
    if(node.op==='!'&&t!=='bool'&&t!=='int') this.error("Unary '!' requires bool",node.line);
    return node.op==='-'?'int':'bool';
  }

  analyzeCall(node){
    const sym=this.scope.lookup(node.name);
    if(!sym) this.error(`Undeclared function '${node.name}'`,node.line);
    if(sym&&sym.kind!=='func') this.error(`'${node.name}' is not a function`,node.line);
    if(sym?.params&&node.args.length!==sym.params.length)
      this.error(`Function '${node.name}' expects ${sym.params.length} args, got ${node.args.length}`,node.line);
    node.args.forEach((a,i)=>{ const at=this.analyze(a); if(sym?.params?.[i]&&at!==sym.params[i].type&&!(sym.params[i].type==='int'&&at==='bool')) this.error(`Arg ${i+1} type mismatch in call to '${node.name}'`,node.line); });
    return sym?.varType||'unknown';
  }
}

// ─────────────────────────────────────────────────────────────
// PHASE 4: IR GENERATOR (Three-Address Code)
// ─────────────────────────────────────────────────────────────
class IRGen {
  constructor(){ this.instructions=[]; this.tmpCount=0; this.labelCount=0; }
  tmp(){ return `t${++this.tmpCount}`; }
  label(prefix='L'){ return `${prefix}${++this.labelCount}`; }
  emit(op,arg1=null,arg2=null,result=null){ const instr={op,arg1,arg2,result}; this.instructions.push(instr); return instr; }

  gen(node){
    if(!node) return null;
    switch(node.type){
      case 'Program': node.declarations.forEach(d=>this.gen(d)); break;
      case 'VarDecl': { if(node.init){ const v=this.gen(node.init); this.emit('ASSIGN',v,null,node.name); } else this.emit('DECLARE',node.varType,null,node.name); break; }
      case 'FuncDecl': {
        this.emit('FUNC_BEGIN',node.name,null,null);
        node.params.forEach(p=>this.emit('PARAM',p.type,null,p.name));
        this.gen(node.body);
        this.emit('FUNC_END',node.name,null,null);
        break;
      }
      case 'Block': node.statements.forEach(s=>this.gen(s)); break;
      case 'If': {
        const condVal=this.gen(node.condition);
        const elseLabel=this.label('else'), endLabel=this.label('endif');
        this.emit('IF_FALSE',condVal,null,elseLabel);
        this.gen(node.thenBranch);
        this.emit('GOTO',null,null,endLabel);
        this.emit('LABEL',elseLabel,null,null);
        if(node.elseBranch) this.gen(node.elseBranch);
        this.emit('LABEL',endLabel,null,null);
        break;
      }
      case 'While': {
        const startLabel=this.label('while'), endLabel=this.label('endwhile');
        this.emit('LABEL',startLabel,null,null);
        const condVal=this.gen(node.condition);
        this.emit('IF_FALSE',condVal,null,endLabel);
        this.gen(node.body);
        this.emit('GOTO',null,null,startLabel);
        this.emit('LABEL',endLabel,null,null);
        break;
      }
      case 'For': {
        const startLabel=this.label('for'), endLabel=this.label('endfor');
        if(node.init) this.gen(node.init);
        this.emit('LABEL',startLabel,null,null);
        if(node.condition){ const cv=this.gen(node.condition); this.emit('IF_FALSE',cv,null,endLabel); }
        this.gen(node.body);
        if(node.increment) this.gen(node.increment);
        this.emit('GOTO',null,null,startLabel);
        this.emit('LABEL',endLabel,null,null);
        break;
      }
      case 'Return': { const v=node.value?this.gen(node.value):null; this.emit('RETURN',v,null,null); break; }
      case 'Break': this.emit('BREAK',null,null,null); break;
      case 'Continue': this.emit('CONTINUE',null,null,null); break;
      case 'Print': { const vals=node.args.map(a=>this.gen(a)); this.emit('PRINT',vals.join(','),null,null); break; }
      case 'ExprStmt': return this.gen(node.expression);
      case 'Assign': { const v=this.gen(node.value); this.emit('ASSIGN',v,null,node.name); return node.name; }
      case 'BinOp': { const l=this.gen(node.left),r=this.gen(node.right),t=this.tmp(); this.emit(this.opCode(node.op),l,r,t); return t; }
      case 'Unary': { const e=this.gen(node.expr),t=this.tmp(); this.emit(node.op==='-'?'NEG':'NOT',e,null,t); return t; }
      case 'Call': { const args=node.args.map(a=>this.gen(a)); args.forEach(a=>this.emit('ARG',a,null,null)); const t=this.tmp(); this.emit('CALL',node.name,args.length,t); return t; }
      case 'Var': return node.name;
      case 'IntLit': return String(node.value);
      case 'BoolLit': return node.value?'1':'0';
      case 'StringLit': return JSON.stringify(node.value);
    }
    return null;
  }

  opCode(op){ const map={'+':'ADD','-':'SUB','*':'MUL','/':'DIV','%':'MOD','==':'EQ','!=':'NEQ','<':'LT','>':'GT','<=':'LTE','>=':'GTE','&&':'AND','||':'OR'}; return map[op]||op; }

  formatIR(){
    return this.instructions.map((instr,i)=>{
      const {op,arg1,arg2,result}=instr;
      let s='';
      switch(op){
        case 'FUNC_BEGIN': s=`\nFUNC ${arg1}:`; break;
        case 'FUNC_END': s=`END FUNC ${arg1}\n`; break;
        case 'PARAM': s=`  PARAM ${arg1} ${result}`; break;
        case 'LABEL': s=`${arg1}:`; break;
        case 'GOTO': s=`  GOTO ${result}`; break;
        case 'IF_FALSE': s=`  IF_FALSE ${arg1} GOTO ${result}`; break;
        case 'ASSIGN': s=`  ${result} = ${arg1}`; break;
        case 'DECLARE': s=`  DECLARE ${arg1} ${result}`; break;
        case 'RETURN': s=`  RETURN${arg1?' '+arg1:''}`; break;
        case 'PRINT': s=`  PRINT ${arg1}`; break;
        case 'BREAK': s=`  BREAK`; break;
        case 'CONTINUE': s=`  CONTINUE`; break;
        case 'ARG': s=`  ARG ${arg1}`; break;
        case 'CALL': s=`  ${result} = CALL ${arg1} ${arg2}`; break;
        case 'NEG': s=`  ${result} = NEG ${arg1}`; break;
        case 'NOT': s=`  ${result} = NOT ${arg1}`; break;
        default: s=`  ${result} = ${arg1} ${op} ${arg2}`; break;
      }
      return `${String(i).padStart(3,'0')}: ${s}`;
    }).join('\n');
  }
}

// Single pass lowering over AST: semantic checks and IR emission together.
class SinglePassCompiler extends IRGen {
  constructor(){
    super();
    this.scope=new SymbolTable();
    this.currentFunc=null;
    this.loopDepth=0;
    this.errors=[];
  }

  error(msg,line){ this.errors.push(new SemanticError(msg,line)); }
  pushScope(){ this.scope=new SymbolTable(this.scope); }
  popScope(){ this.scope=this.scope.parent; }
  canAssign(targetType,valueType){ return valueType===targetType||(targetType==='int'&&valueType==='bool')||valueType==='unknown'; }

  lower(node){
    if(!node) return;
    switch(node.type){
      case 'Program':
        node.declarations.forEach(d=>this.lower(d));
        break;
      case 'VarDecl': {
        if(this.scope.has(node.name)) this.error(`Variable '${node.name}' already declared in this scope`,node.line);
        if(node.init){
          const rhs=this.lowerExpr(node.init);
          if(!this.canAssign(node.varType,rhs.type)) this.error(`Cannot assign '${rhs.type}' to variable of type '${node.varType}'`,node.line);
          this.emit('ASSIGN',rhs.place,null,node.name);
        } else {
          this.emit('DECLARE',node.varType,null,node.name);
        }
        this.scope.define(node.name,{varType:node.varType,kind:'var'});
        break;
      }
      case 'FuncDecl': {
        if(this.scope.has(node.name)) this.error(`Function '${node.name}' already declared`,node.line);
        this.scope.define(node.name,{varType:node.retType,kind:'func',params:node.params});
        this.emit('FUNC_BEGIN',node.name,null,null);
        const prev=this.currentFunc;
        this.currentFunc={retType:node.retType,name:node.name};
        this.pushScope();
        node.params.forEach(p=>{ this.scope.define(p.name,{varType:p.type,kind:'param'}); this.emit('PARAM',p.type,null,p.name); });
        this.lower(node.body);
        this.popScope();
        this.currentFunc=prev;
        this.emit('FUNC_END',node.name,null,null);
        break;
      }
      case 'Block':
        this.pushScope();
        node.statements.forEach(s=>this.lower(s));
        this.popScope();
        break;
      case 'If': {
        const cond=this.lowerExpr(node.condition);
        if(cond.type!=='bool'&&cond.type!=='int') this.error('If condition must be bool or int',node.line);
        const elseLabel=this.label('else'), endLabel=this.label('endif');
        this.emit('IF_FALSE',cond.place,null,elseLabel);
        this.lower(node.thenBranch);
        this.emit('GOTO',null,null,endLabel);
        this.emit('LABEL',elseLabel,null,null);
        if(node.elseBranch) this.lower(node.elseBranch);
        this.emit('LABEL',endLabel,null,null);
        break;
      }
      case 'While': {
        const startLabel=this.label('while'), endLabel=this.label('endwhile');
        this.emit('LABEL',startLabel,null,null);
        const cond=this.lowerExpr(node.condition);
        if(cond.type!=='bool'&&cond.type!=='int') this.error('While condition must be bool or int',node.line);
        this.emit('IF_FALSE',cond.place,null,endLabel);
        this.loopDepth++;
        this.lower(node.body);
        this.loopDepth--;
        this.emit('GOTO',null,null,startLabel);
        this.emit('LABEL',endLabel,null,null);
        break;
      }
      case 'For': {
        this.pushScope();
        const startLabel=this.label('for'), endLabel=this.label('endfor');
        if(node.init) this.lower(node.init);
        this.emit('LABEL',startLabel,null,null);
        if(node.condition){
          const cond=this.lowerExpr(node.condition);
          if(cond.type!=='bool'&&cond.type!=='int') this.error('For condition must be bool or int',node.line);
          this.emit('IF_FALSE',cond.place,null,endLabel);
        }
        this.loopDepth++;
        this.lower(node.body);
        this.loopDepth--;
        if(node.increment) this.lowerExpr(node.increment);
        this.emit('GOTO',null,null,startLabel);
        this.emit('LABEL',endLabel,null,null);
        this.popScope();
        break;
      }
      case 'Return': {
        if(!this.currentFunc) this.error('Return outside function',node.line);
        const v=node.value?this.lowerExpr(node.value):{type:'void',place:null};
        if(this.currentFunc&&!this.canAssign(this.currentFunc.retType,v.type))
          this.error(`Return type mismatch: expected '${this.currentFunc.retType}', got '${v.type}'`,node.line);
        this.emit('RETURN',v.place,null,null);
        break;
      }
      case 'Break':
        if(this.loopDepth===0) this.error("'break' outside loop",node.line);
        this.emit('BREAK',null,null,null);
        break;
      case 'Continue':
        if(this.loopDepth===0) this.error("'continue' outside loop",node.line);
        this.emit('CONTINUE',null,null,null);
        break;
      case 'Print': {
        const vals=node.args.map(a=>this.lowerExpr(a).place);
        this.emit('PRINT',vals.join(','),null,null);
        break;
      }
      case 'ExprStmt':
        this.lowerExpr(node.expression);
        break;
    }
  }

  lowerExpr(node){
    if(!node) return { type:'void', place:null };
    switch(node.type){
      case 'Assign': {
        const sym=this.scope.lookup(node.name);
        if(!sym) this.error(`Undeclared variable '${node.name}'`,node.line);
        const rhs=this.lowerExpr(node.value);
        if(sym&&!this.canAssign(sym.varType,rhs.type)) this.error(`Cannot assign '${rhs.type}' to '${node.name}' (type '${sym.varType}')`,node.line);
        this.emit('ASSIGN',rhs.place,null,node.name);
        return { type:sym?.varType||'int', place:node.name };
      }
      case 'BinOp': {
        const l=this.lowerExpr(node.left), r=this.lowerExpr(node.right);
        const arith=['+','-','*','/','%'];
        const cmp=['<','>','<=','>='];
        const eq=['==','!='];
        let outType='bool';
        if(arith.includes(node.op)){
          if(l.type!=='int'||r.type!=='int') this.error(`Arithmetic op '${node.op}' requires int operands`,node.line);
          outType='int';
        } else if(cmp.includes(node.op)){
          if(l.type!=='int'||r.type!=='int') this.error(`Comparison '${node.op}' requires int operands`,node.line);
          outType='bool';
        } else if(eq.includes(node.op)){
          if(l.type!==r.type) this.error(`Equality '${node.op}' on mismatched types '${l.type}' and '${r.type}'`,node.line);
          outType='bool';
        }
        const t=this.tmp();
        this.emit(this.opCode(node.op),l.place,r.place,t);
        return { type:outType, place:t };
      }
      case 'Unary': {
        const v=this.lowerExpr(node.expr);
        if(node.op==='-'&&v.type!=='int') this.error("Unary '-' requires int",node.line);
        if(node.op==='!'&&v.type!=='bool'&&v.type!=='int') this.error("Unary '!' requires bool",node.line);
        const t=this.tmp();
        this.emit(node.op==='-'?'NEG':'NOT',v.place,null,t);
        return { type:node.op==='-'?'int':'bool', place:t };
      }
      case 'Call': {
        const sym=this.scope.lookup(node.name);
        if(!sym) this.error(`Undeclared function '${node.name}'`,node.line);
        if(sym&&sym.kind!=='func') this.error(`'${node.name}' is not a function`,node.line);
        if(sym?.params&&node.args.length!==sym.params.length)
          this.error(`Function '${node.name}' expects ${sym.params.length} args, got ${node.args.length}`,node.line);
        const args=node.args.map(a=>this.lowerExpr(a));
        args.forEach((a,i)=>{ if(sym?.params?.[i]&&!this.canAssign(sym.params[i].type,a.type)) this.error(`Arg ${i+1} type mismatch in call to '${node.name}'`,node.line); });
        args.forEach(a=>this.emit('ARG',a.place,null,null));
        const t=this.tmp();
        this.emit('CALL',node.name,args.length,t);
        return { type:sym?.varType||'unknown', place:t };
      }
      case 'Var': {
        const sym=this.scope.lookup(node.name);
        if(!sym) this.error(`Undeclared variable '${node.name}'`,node.line);
        return { type:sym?.varType||'int', place:node.name };
      }
      case 'IntLit': return { type:'int', place:String(node.value) };
      case 'BoolLit': return { type:'bool', place:node.value?'1':'0' };
      case 'StringLit': return { type:'string', place:JSON.stringify(node.value) };
    }
    return { type:'unknown', place:null };
  }
}

// ─────────────────────────────────────────────────────────────
// PHASE 5: VIRTUAL MACHINE (IR Interpreter)
// ─────────────────────────────────────────────────────────────
class VMError extends Error { constructor(msg,line){super(msg);this.phase='VM';this.line=line;} }

class VirtualMachine {
  constructor(instructions, outputCallback){
    this.instructions=instructions;
    this.output=outputCallback||((s)=>console.log(s));
    this.labelMap={};
    this.funcMap={};
    this.callStack=[];
    this.globals={};
    this.stepCount=0;
    this.maxSteps=100000;
    this.buildMaps();
  }

  buildMaps(){
    this.instructions.forEach((instr,i)=>{
      if(instr.op==='LABEL') this.labelMap[instr.arg1]=i;
      if(instr.op==='FUNC_BEGIN') this.funcMap[instr.arg1]=i;
    });
  }

  resolve(val, env){
    if(val===null||val===undefined) return null;
    if(val.startsWith('"')) return val.slice(1,-1).replace(/\\n/g,'\n').replace(/\\t/g,'\t');
    const n=Number(val);
    if(!isNaN(n)) return n;
    if(val in env) return env[val];
    if(val in this.globals) return this.globals[val];
    return null;
  }

  run(){
    // Find main or execute top-level
    let pc=0;
    const topEnv={};
    // Execute instructions up to first FUNC_BEGIN or end
    while(pc<this.instructions.length){
      const result=this.step(pc,topEnv);
      if(result===null) break;
      pc=result;
    }
  }

  step(pc, env){
    if(pc>=this.instructions.length) return null;
    if(++this.stepCount>this.maxSteps) throw new VMError('Execution limit exceeded (infinite loop?)');
    const instr=this.instructions[pc];
    const {op,arg1,arg2,result}=instr;

    switch(op){
      case 'FUNC_BEGIN': return null; // skip function defs in top-level
      case 'FUNC_END': {
        // return from function
        if(this.callStack.length>0){
          const frame=this.callStack.pop();
          if(frame.resultDest) frame.callerEnv[frame.resultDest]=null;
          Object.assign(env,{}); // restore
          return frame.returnPC;
        }
        return null;
      }
      case 'DECLARE': env[result]=0; return pc+1;
      case 'ASSIGN': env[result]=this.resolve(arg1,env); return pc+1;
      case 'LABEL': return pc+1;
      case 'GOTO': return (this.labelMap[result]??pc)+1;
      case 'IF_FALSE': return this.resolve(arg1,env)?pc+1:(this.labelMap[result]??pc)+1;
      case 'RETURN': {
        const retVal=arg1?this.resolve(arg1,env):null;
        if(this.callStack.length>0){
          const frame=this.callStack.pop();
          if(frame.resultDest) frame.callerEnv[frame.resultDest]=retVal;
          return frame.returnPC;
        }
        return null;
      }
      case 'PRINT': {
        const parts=arg1.split(',').map(v=>this.resolve(v.trim(),env));
        this.output(parts.map(p=>p===null?'null':String(p)).join(' ')+'\n');
        return pc+1;
      }
      case 'BREAK': return null;
      case 'CONTINUE': return null;
      case 'ARG': { if(!this._pendingArgs) this._pendingArgs=[]; this._pendingArgs.push(this.resolve(arg1,env)); return pc+1; }
      case 'CALL': {
        const funcName=arg1, argCount=Number(arg2);
        const args=this._pendingArgs?.splice(0,argCount)||[];
        this._pendingArgs=this._pendingArgs?.filter((_,i)=>i>=argCount)||[];
        if(!(funcName in this.funcMap)) throw new VMError(`Undefined function '${funcName}'`);
        const funcPC=this.funcMap[funcName];
        this.callStack.push({returnPC:pc+1,resultDest:result,callerEnv:env});
        // Set up new env with params
        const newEnv=Object.create(null);
        let paramIdx=0;
        for(let i=funcPC+1;i<this.instructions.length;i++){
          if(this.instructions[i].op==='PARAM'){ newEnv[this.instructions[i].result]=args[paramIdx++]??0; }
          else break;
        }
        // Execute function body — simplified direct execution
        return this.execFunc(funcName,newEnv,args,result,env,pc+1);
      }
      // Arithmetic
      case 'ADD': env[result]=this.resolve(arg1,env)+this.resolve(arg2,env); return pc+1;
      case 'SUB': env[result]=this.resolve(arg1,env)-this.resolve(arg2,env); return pc+1;
      case 'MUL': env[result]=this.resolve(arg1,env)*this.resolve(arg2,env); return pc+1;
      case 'DIV': { const dv=this.resolve(arg2,env); if(dv===0)throw new VMError('Division by zero'); env[result]=Math.trunc(this.resolve(arg1,env)/dv); return pc+1; }
      case 'MOD': { const mv=this.resolve(arg2,env); if(mv===0)throw new VMError('Modulo by zero'); env[result]=this.resolve(arg1,env)%mv; return pc+1; }
      case 'EQ': env[result]=this.resolve(arg1,env)===this.resolve(arg2,env)?1:0; return pc+1;
      case 'NEQ': env[result]=this.resolve(arg1,env)!==this.resolve(arg2,env)?1:0; return pc+1;
      case 'LT': env[result]=this.resolve(arg1,env)<this.resolve(arg2,env)?1:0; return pc+1;
      case 'GT': env[result]=this.resolve(arg1,env)>this.resolve(arg2,env)?1:0; return pc+1;
      case 'LTE': env[result]=this.resolve(arg1,env)<=this.resolve(arg2,env)?1:0; return pc+1;
      case 'GTE': env[result]=this.resolve(arg1,env)>=this.resolve(arg2,env)?1:0; return pc+1;
      case 'AND': env[result]=(this.resolve(arg1,env)&&this.resolve(arg2,env))?1:0; return pc+1;
      case 'OR': env[result]=(this.resolve(arg1,env)||this.resolve(arg2,env))?1:0; return pc+1;
      case 'NEG': env[result]=-this.resolve(arg1,env); return pc+1;
      case 'NOT': env[result]=!this.resolve(arg1,env)?1:0; return pc+1;
      default: return pc+1;
    }
  }

  execFunc(name, env, args, resultDest, callerEnv, returnPC){
    // Inline function execution
    let pc=this.funcMap[name]+1;
    // skip params
    while(pc<this.instructions.length&&this.instructions[pc].op==='PARAM') pc++;
    const breakStack=[];
    while(pc<this.instructions.length&&++this.stepCount<this.maxSteps){
      const instr=this.instructions[pc];
      if(instr.op==='FUNC_END') break;
      if(instr.op==='FUNC_BEGIN') break;
      if(instr.op==='RETURN'){
        const rv=instr.arg1?this.resolve(instr.arg1,env):null;
        if(resultDest) callerEnv[resultDest]=rv;
        return returnPC;
      }
      if(instr.op==='CALL'){
        const npc=this.step(pc,env);
        pc=npc??pc+1;
      } else {
        const npc=this.stepInFunc(pc,env,instr);
        pc=npc??pc+1;
      }
    }
    if(resultDest) callerEnv[resultDest]=null;
    return returnPC;
  }

  stepInFunc(pc,env,instr){
    return this.step(pc,env);
  }
}

// ─────────────────────────────────────────────────────────────
// PHASE 6: ASSEMBLY CODE GENERATOR (x86-like pseudo-assembly)
// ─────────────────────────────────────────────────────────────
class AsmGen {
  constructor(irInstructions){ this.ir=irInstructions; this.asm=[]; }

  header(){ return ['; ABC Tech Compiler — Generated Assembly','section .data','section .text','global _start','']; }

  gen(){
    const lines=[...this.header()];
    for(const instr of this.ir){
      const {op,arg1,arg2,result}=instr;
      switch(op){
        case 'FUNC_BEGIN': lines.push(`${arg1}:`,`  push rbp`,`  mov rbp, rsp`); break;
        case 'FUNC_END': lines.push(`  pop rbp`,`  ret`,``); break;
        case 'PARAM': lines.push(`  ; param ${result}: ${arg1}`); break;
        case 'DECLARE': lines.push(`  sub rsp, 8  ; declare ${result}`); break;
        case 'ASSIGN': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'ADD': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  add rax, ${this.op2asm(arg2)}`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'SUB': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  sub rax, ${this.op2asm(arg2)}`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'MUL': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  imul rax, ${this.op2asm(arg2)}`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'DIV': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  mov rbx, ${this.op2asm(arg2)}`,`  cqo`,`  idiv rbx`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'EQ': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  cmp rax, ${this.op2asm(arg2)}`,`  sete al`,`  movzx rax, al`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'LT': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  cmp rax, ${this.op2asm(arg2)}`,`  setl al`,`  movzx rax, al`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'GT': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  cmp rax, ${this.op2asm(arg2)}`,`  setg al`,`  movzx rax, al`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'LABEL': lines.push(`${arg1}:`); break;
        case 'GOTO': lines.push(`  jmp ${result}`); break;
        case 'IF_FALSE': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  test rax, rax`,`  jz ${result}`); break;
        case 'RETURN': lines.push(arg1?`  mov rax, ${this.op2asm(arg1)}`:'',`  pop rbp`,`  ret`); break;
        case 'PRINT': lines.push(`  ; SYSCALL PRINT ${arg1}`); break;
        case 'NEG': lines.push(`  mov rax, ${this.op2asm(arg1)}`,`  neg rax`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        case 'ARG': lines.push(`  push ${this.op2asm(arg1)}`); break;
        case 'CALL': lines.push(`  call ${arg1}`,`  mov [rbp-${this.stackOffset(result)}], rax`); break;
        default: lines.push(`  ; ${op} ${arg1??''} ${arg2??''} → ${result??''}`);
      }
    }
    lines.push('_start:',`  call main`,`  mov rdi, rax`,`  mov rax, 60`,`  syscall`);
    return lines.join('\n');
  }

  stackSlots={}; slotCount=0;
  stackOffset(name){ if(!(name in this.stackSlots)) this.stackSlots[name]=(++this.slotCount)*8; return this.stackSlots[name]; }
  op2asm(v){ if(v===null||v===undefined)return '0'; const n=Number(v); if(!isNaN(n))return String(n); return `[rbp-${this.stackOffset(v)}]`; }
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPILER ORCHESTRATOR
// ─────────────────────────────────────────────────────────────
function compile(sourceCode, outputCallback){
  const result={
    tokens:[], ast:null, semanticErrors:[], ir:'', assembly:'',
    output:'', errors:[], phases:{}, success:false,
    stats:{ lines:0, tokens:0, instructions:0, errors:0 }
  };

  const t0=performance.now();

  try {
    // Phase 1: Lexing
    const lexer=new CleanLexer(sourceCode);
    result.tokens=lexer.tokenize();
    result.stats.tokens=result.tokens.length;
    result.phases.lexer={time:(performance.now()-t0).toFixed(2),ok:true};
  } catch(e){
    result.errors.push({phase:e.phase||'Lexer',message:e.message,line:e.line,col:e.col});
    result.phases.lexer={time:(performance.now()-t0).toFixed(2),ok:false};
    return result;
  }

  const t1=performance.now();
  try {
    // Phase 2: Parsing
    const parser=new Parser(result.tokens);
    result.ast=parser.parse();
    result.phases.parser={time:(performance.now()-t1).toFixed(2),ok:true};
  } catch(e){
    result.errors.push({phase:e.phase||'Parser',message:e.message,line:e.line,col:e.col});
    result.phases.parser={time:(performance.now()-t1).toFixed(2),ok:false};
    return result;
  }

  const t2=performance.now();
  let singlePass;
  try {
    // Phase 3+4 combined: single-pass semantic analysis and IR generation.
    singlePass=new SinglePassCompiler();
    singlePass.lower(result.ast);
    result.semanticErrors=singlePass.errors;
    result.phases.semantic={time:(performance.now()-t2).toFixed(2),ok:singlePass.errors.length===0,warnings:singlePass.errors.length};
    singlePass.errors.forEach(e=>result.errors.push({phase:'Semantic',message:e.message,line:e.line}));
    result.ir=singlePass.formatIR();
    result.stats.instructions=singlePass.instructions.length;
    result.phases.irgen={time:(performance.now()-t2).toFixed(2),ok:true};
  } catch(e){
    result.errors.push({phase:e.phase||'SinglePass',message:e.message,line:e.line,col:e.col});
    result.phases.semantic={time:(performance.now()-t2).toFixed(2),ok:false};
    result.phases.irgen={time:(performance.now()-t2).toFixed(2),ok:false};
    return result;
  }

  const t3=performance.now();
  try {
    // Phase 5: Assembly Generation
    const asmGen=new AsmGen(singlePass.instructions);
    result.assembly=asmGen.gen();
    result.phases.asm={time:(performance.now()-t3).toFixed(2),ok:true};

    // Phase 6: VM Execution
    if(result.errors.length===0){
      const t4=performance.now();
      let programOutput='';
      const vm=new VirtualMachine(singlePass.instructions,(s)=>{programOutput+=s;if(outputCallback)outputCallback(s);});
      vm.run();
      result.output=programOutput;
      result.phases.vm={time:(performance.now()-t4).toFixed(2),ok:true};
    }
  } catch(e){
    result.errors.push({phase:e.phase||'Execution',message:e.message,line:e.line});
    result.phases.vm={time:0,ok:false};
  }

  result.stats.lines=sourceCode.split('\n').length;
  result.stats.errors=result.errors.length;
  result.success=result.errors.length===0;
  result.totalTime=(performance.now()-t0).toFixed(2);
  return result;
}

// Export for use in HTML
if(typeof window !== 'undefined') window.ABCCompiler = { compile, TokenType };
