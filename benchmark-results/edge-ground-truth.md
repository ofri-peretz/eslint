# ILB-Edge ground truth

> 2539 findings across 274 pattern classes — 4 labelled, 270 awaiting a verdict.

Every finding on the Edge corpus belongs to a pattern class, and every class
carries a written verdict. **FP** classes are rule bugs and must reach zero;
**TP** classes are real findings that stay reported. A class with no verdict
fails the strict audit — untriaged findings must never silently become the
published FP number.

| Findings | Verdict | Class | Example |
|---:|:--|:--|:--|
| 1019 | ✅ TP | `secure-coding/detect-object-injection::obj[<ident>]` | `let animationMorphTargets = animationToMorphTargets[ name ];` |
| 199 | ⚠️ unlabelled | `secure-coding/detect-object-injection::obj[<ident>.<field>]` | `indicesByUUID[ lastCachedObject.uuid ] = index;` |
| 146 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::for(...)` | `for ( let i = startIndex; i < endIndex; i ++ ) {` |
| 110 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::if(...)` | `if ( key === undefined ) return; // no data` |
| 66 | 🔴 FP | `node-security/no-buffer-overread::obj[<arithmetic expr>]` | `const timeNext = times[ i + 1 ];` |
| 55 | 🔴 FP | `secure-coding/detect-object-injection::obj[<arithmetic expr>]` | `value !== values[ offsetN + j ] ) {` |
| 53 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Set(...)` | `nodeData.subBuilds = nodeData.subBuilds  new Set();` |
| 50 | ⚠️ unlabelled | `secure-coding/detect-object-injection::obj[<complex expr>]` | `indices[ arguments[ i ].uuid ] = i;` |
| 47 | 🔴 FP | `node-security/no-buffer-overread::obj[<ident>]` | `const time = times[ i ];` |
| 38 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::other` | `const pattern = /^([\w-]*?)([\d]+)$/;` |
| 31 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::allocate(...)` | `allocate(5 + lengths.length * 4);` |
| 30 | ⚠️ unlabelled | `secure-coding/detect-object-injection::other` | `(idToHashMap)[/** @type {ModuleId} */ (moduleId)] = hashLeng` |
| 25 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::obj[<ident>]` | `while ( key !== undefined && key[ valuePropertyName ] === un` |
| 25 | ⚠️ unlabelled | `secure-coding/detect-object-injection::obj[this.<field>]` | `this.targetObject[ this.propertyName ] = buffer[ offset ];` |
| 24 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::while(...)` | `while ( parameters.length < inputs.length ) {` |
| 22 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::obj[<ident>]` | `this.uniforms[ name ].value = new Vector2().fromArray( unifo` |
| 22 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::other` | `force = force  this.version !== this._cacheKeyVersion;` |
| 18 | ⚠️ unlabelled | `secure-coding/detect-non-literal-regexp::RegExp(...)` | `const _reservedRe = new RegExp( '[' + _RESERVED_CHARS_RE + '` |
| 18 | ⚠️ unlabelled | `secure-coding/detect-object-injection::Object.assign(...)` | `Object.assign( this.spaces, colorSpaces );` |
| 16 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Map(...)` | `const newEntryModules = new Map();` |
| 15 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::obj[<complex expr>]` | `for ( const [ uid, baseOffset ] of this.queryOffsets ) {` |
| 12 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_vector.fromBufferAttribute(...)` | `_vector.fromBufferAttribute( this, i );` |
| 12 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::if(...)` | `if ( data.offset !== undefined ) texture.offset.fromArray( d` |
| 10 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::if(...)` | `if ( /^(https?:)?\/\//i.test( url ) ) return url;` |
| 10 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::exec(...)` | `const match = /^"\s\+*\s*(.*)\s*\+\s*"$/.exec(id);` |
| 9 | ⚠️ unlabelled | `node-security/no-buffer-overread::obj[<ident>.<field>]` | `currentBoundFramebuffers[ gl.FRAMEBUFFER ] = framebuffer;` |
| 8 | ⚠️ unlabelled | `secure-coding/no-unsafe-regex-construction::RegExp(...)` | `const WEBPACK_REQUIRE_IDENTIFIER_REGEXP = new RegExp(Runtime` |
| 7 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Float32Array(...)` | `const position = new Float32Array( positionSize * vertices *` |
| 6 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::while(...)` | `} while ( key !== undefined );` |
| 6 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::value.toArray(...)` | `value.toArray( values, values.length );` |
| 6 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::planes.setAttribute(...)` | `planes.setAttribute( 'position', new BufferAttribute( positi` |
| 6 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::other` | `return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );` |
| 6 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::gl.bindBuffer(...)` | `gl.bindBuffer( gl.ARRAY_BUFFER, buffer );` |
| 6 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::WeakTupleMap(...)` | `const memCache = new WeakTupleMap();` |
| 6 | ⚠️ unlabelled | `secure-coding/no-improper-sanitization::if(...)` | `else if (_ifTwoCodePointsAreValidEscape(input, pos)) {` |
| 6 | ⚠️ unlabelled | `node-security/no-unsafe-buffer-alloc::Buffer.allocUnsafe(...)` | `currentBuffer = Buffer.allocUnsafe(allocationScope.allocatio` |
| 5 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this._copyBufferToTexture(...)` | `this._copyBufferToTexture( mipmap, textureData.texture, text` |
| 5 | ⚠️ unlabelled | `secure-coding/detect-object-injection::obj[<string literal>]` | `definitions[process.env.${key}] = defValue;` |
| 5 | ⚠️ unlabelled | `secure-coding/detect-object-injection::moduleGraph.getMeta(...)` | `return moduleGraph.getMeta(this)[idsSymbol]  this.ids;` |
| 4 | ⚠️ unlabelled | `node-security/no-buffer-overread::obj[<update expr>]` | `buffer[ offset ++ ] = source[ i ];` |
| 4 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::color.toArray(...)` | `color.toArray( colors, j ); j += 3;` |
| 4 | ⚠️ unlabelled | `secure-coding/no-unsafe-deserialization::onLoad(...)` | `onLoad( scope.parse( JSON.parse( text ) ) );` |
| 4 | ⚠️ unlabelled | `secure-coding/no-unsafe-deserialization::JSON.parse(...)` | `json = JSON.parse( text );` |
| 4 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::imageArray.push(...)` | `imageArray.push( deserializedImage );` |
| 4 | ⚠️ unlabelled | `node-security/no-math-random-crypto::Math.random(...)` | `const d0 = Math.random() * 0xffffffff  0;` |
| 4 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::for(...)` | `for ( const canvasTarget of this._frameBufferTargets.keys()` |
| 4 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.readFile(...)` | `fs.readFile(file, (err, content) => {` |
| 4 | ⚠️ unlabelled | `secure-coding/no-xxe-injection::JSON.parse(...)` | `data = JSON.parse(/** @type {Buffer} */ (content).toString("` |
| 4 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::newArray.push(...)` | `newArray.push(item);` |
| 4 | ⚠️ unlabelled | `secure-coding/no-improper-sanitization::_consumeAnEscapedCodePoint(...)` | `pos = _consumeAnEscapedCodePoint(input, pos);` |
| 4 | ⚠️ unlabelled | `n/no-unsupported-features/node-builtins::other` | `// eslint-disable-next-line n/no-unsupported-features/node-b` |
| 4 | ⚠️ unlabelled | `unicorn/prefer-spread::other` | `// eslint-disable-next-line unicorn/prefer-spread` |
| 4 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::currentBuffer.writeInt32LE(...)` | `currentBuffer.writeInt32LE(` |
| 4 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Buffer.from(...)` | `Buffer.from(` |
| 4 | ⚠️ unlabelled | `secure-coding/detect-non-literal-regexp::other` | `const RE_HOSTNAME = /^(?:[^/.]+(?:\.[^/]+)+localhost)$/;` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Quaternion(...)` | `const referenceQuat = new Quaternion().fromArray( referenceV` |
| 3 | ⚠️ unlabelled | `secure-coding/detect-object-injection::obj[<numeric literal>]` | `_tables.uint32View[ 0 ] = _tables.mantissaTable[ _tables.off` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::obj[<numeric literal>]` | `a.fromBufferAttribute( positionAttr, indexArr[ 0 ] );` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_morphVec4.fromBufferAttribute(...)` | `_morphVec4.fromBufferAttribute( morphTarget, j );` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::obj[<ident>]` | `for ( const uuid of json.inputNodes[ property ] ) {` |
| 3 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::select(...)` | `this._currentCond = select( boolNode, methodNode );` |
| 3 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::s(...)` | `const regex = /(?:at\s+(.+?)\s+\()?(?:(.+?)@)?([^@\s()]+):(\` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::morph.fromBufferAttribute(...)` | `morph.fromBufferAttribute( morphTarget, j );` |
| 3 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.stat(...)` | `fs.stat(filename, callback);` |
| 3 | ⚠️ unlabelled | `node-security/no-arbitrary-file-access::fs.stat(...)` | `fs.stat(filename, callback);` |
| 3 | ⚠️ unlabelled | `node-security/no-arbitrary-file-access::fs.readFile(...)` | `fs.readFile(file, (err, content) => {` |
| 3 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::obj[<arithmetic expr>]` | `/(^.+[\\/]node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+)/.exec(` |
| 3 | ⚠️ unlabelled | `node-security/no-unsafe-dynamic-require::require(...)` | `require(loader.loader);` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unsafe-regex-construction::setRegExp(...)` | `.setRegExp(flags ? new RegExp(regExp, flags) : new RegExp(re` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this._preWalkArrayPattern(...)` | `? this._preWalkArrayPattern(property.value)` |
| 3 | ⚠️ unlabelled | `n/no-unsupported-features/es-builtins::other` | `// eslint-disable-next-line n/no-unsupported-features/es-bui` |
| 3 | ⚠️ unlabelled | `n/no-unsupported-features/es-syntax::other` | `// eslint-disable-next-line n/no-unsupported-features/es-bui` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::currentBuffer.write(...)` | `currentBuffer.write(thing, currentPosition);` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::currentBuffer.writeInt8(...)` | `currentBuffer.writeInt8(` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Buffer.isBuffer(...)` | `currentIsBuffer = Buffer.isBuffer(currentBuffer);` |
| 3 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::Object.keys(...)` | `Object.keys(AVAILABLE_FORMATS)` |
| 2 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::interpolant.evaluate(...)` | `const interpolantValue = interpolant.evaluate( time )[ 0 ];` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::AnimationUtils.sortedArray(...)` | `times = AnimationUtils.sortedArray( times, 1, order );` |
| 2 | ⚠️ unlabelled | `node-security/no-buffer-overread::times.slice(...)` | `this.times = times.slice( 0, writeIndex );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::source.replace(...)` | `const _directoryRe = /*@__PURE__*/ /((?:WC+[\/:])*)/.source.` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::pA.fromBufferAttribute(...)` | `pA.fromBufferAttribute( positionAttribute, vA );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::pB.fromBufferAttribute(...)` | `pB.fromBufferAttribute( positionAttribute, vB );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::pC.fromBufferAttribute(...)` | `pC.fromBufferAttribute( positionAttribute, vC );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::convertBufferAttribute(...)` | `const newAttribute = convertBufferAttribute( attribute, indi` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::BufferGeometry(...)` | `const planes = new BufferGeometry();` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::data.points.push(...)` | `data.points.push( point.toArray() );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this.points.push(...)` | `this.points.push( new Vector3().fromArray( point ) );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::start.fromBufferAttribute(...)` | `start.fromBufferAttribute( position, index1 );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::end.fromBufferAttribute(...)` | `end.fromBufferAttribute( position, index2 );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::getInterleavedBuffer(...)` | `const interleavedBuffer = getInterleavedBuffer( json.data, a` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::InterleavedBufferAttribute(...)` | `bufferAttribute = new InterleavedBufferAttribute( interleave` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::getTypedArray(...)` | `const typedArray = getTypedArray( attribute.type, attribute.` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::BufferAttribute(...)` | `bufferAttribute = new BufferAttribute( typedArray, attribute` |
| 2 | ⚠️ unlabelled | `secure-coding/no-xxe-injection::obj[<ident>.<field>]` | `cache[ data.uuid ] = loader.parse( data );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::i.test(...)` | `const path = /^(\/\/)([a-z]+:(\/\/)?)/i.test( url ) ? url :` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this.expandByPoint(...)` | `this.expandByPoint( _vector.fromArray( array, i ) );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_position.fromBufferAttribute(...)` | `_position.fromBufferAttribute( positionAttribute, a );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::camera.matrix.fromArray(...)` | `camera.matrix.fromArray( view.transform.matrix );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::camera.projectionMatrix.fromArray(...)` | `camera.projectionMatrix.fromArray( view.projectionMatrix );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::invalidationArrayRead.push(...)` | `invalidationArrayRead.push( _gl.COLOR_ATTACHMENT0 + i );` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::gl.clearBufferfv(...)` | `gl.clearBufferfv( gl.COLOR, i, [ clearColor.r, clearColor.g,` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::device.queue.writeBuffer(...)` | `device.queue.writeBuffer(` |
| 2 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::other` | `(fs.lstat)(filename, callback);` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::parseString(...)` | `dependency = parseString(` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::dependencies.set(...)` | `dependencies.set(target.module, new Set([module]));` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::getExtractSourceMap(...)` | `const { source, sourceMap } = await getExtractSourceMap()(` |
| 2 | ⚠️ unlabelled | `jsdoc/type-formatting::other` | `/* eslint-disable jsdoc/type-formatting */` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unsafe-regex-construction::obj[<numeric literal>]` | `return new RegExp(match[1], match[2]);` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::other` | `const match = ["all", "javascript", "css"]` |
| 2 | ⚠️ unlabelled | `secure-coding/no-improper-sanitization::_ifTwoCodePointsAreValidEscape(...)` | `_ifTwoCodePointsAreValidEscape(input, pos, second, third)` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unsafe-regex-construction::quoteMeta(...)` | `^${quoteMeta(prefix)}${innerRegExp}${quoteMeta(postfix)}$` |
| 2 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::request.replace(...)` | `request.replace(/^(\.\.?\/)+/, "").replace(/(^[.-][^a-z0-9_-` |
| 2 | ⚠️ unlabelled | `secure-coding/detect-non-literal-regexp::setRegExp(...)` | `.setRegExp(flags ? new RegExp(regExp, flags) : new RegExp(re` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this.parseString(...)` | `this.parseString(/** @type {Expression} */ (expression.left)` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unsafe-regex-construction::item.replace(...)` | `[\\\\/]${item.replace(/[-[\]{}()*+?.\\^$]/g, "\\$&")}([\\\\/` |
| 2 | ⚠️ unlabelled | `node-security/no-zip-slip::require(...)` | `const StartupChunkDependenciesPlugin = require("../runtime/S` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::WeakMap(...)` | `const superClassCache = new WeakMap();` |
| 2 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::hashToNewHash.get(...)` | `(hash) => hashToNewHash.get(hash) !== hash` |
| 2 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::obj[<arithmetic expr>]` | `(key) => rule[/** @type {keyof RuleSetRule} */ (key)] !== un` |
| 2 | ⚠️ unlabelled | `secure-coding/no-xxe-injection::Lockfile.parse(...)` | `? Lockfile.parse(buffer.toString("utf8"))` |
| 2 | ⚠️ unlabelled | `unicorn/error-message::other` | `// eslint-disable-next-line n/no-unsupported-features/es-bui` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Buffer.byteLength(...)` | `const len = Buffer.byteLength(thing);` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::readInt8(...)` | `(currentBuffer).readInt8(currentPosition);` |
| 2 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::readInt32LE(...)` | `const value = /** @type {Buffer} */ (currentBuffer).readInt3` |
| 2 | ⚠️ unlabelled | `n/exports-style::other` | `// eslint-disable-next-line n/exports-style` |
| 2 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::isRequiredVersion(...)` | `item === key  !isRequiredVersion(item)` |
| 2 | ⚠️ unlabelled | `secure-coding/detect-object-injection::if(...)` | `if (/** @type {SetWithDeprecatedArrayMethods<T>} */ (set)[me` |
| 2 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.mkdir(...)` | `fs.mkdir(p, (err) => {` |
| 2 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.mkdirSync(...)` | `fs.mkdirSync(p);` |
| 2 | ⚠️ unlabelled | `react-internal/no-production-logging::other` | `// eslint-disable-next-line react-internal/no-production-log` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::interpolant.resultBuffer.slice(...)` | `referenceValue = interpolant.resultBuffer.slice( startIndex,` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::referenceQuat.toArray(...)` | `referenceQuat.toArray( referenceValue );` |
| 1 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::for(...)` | `for ( let i = 0; i !== nKeys; i ++ ) {` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_vector2.fromBufferAttribute(...)` | `_vector2.fromBufferAttribute( this, i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_box.setFromBufferAttribute(...)` | `_box.setFromBufferAttribute( morphAttribute );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_boxMorphTargets.setFromBufferAttribute(...)` | `_boxMorphTargets.setFromBufferAttribute( morphAttribute );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_offset.fromBufferAttribute(...)` | `_offset.fromBufferAttribute( position, j );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::nA.fromBufferAttribute(...)` | `nA.fromBufferAttribute( normalAttribute, vA );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::nB.fromBufferAttribute(...)` | `nB.fromBufferAttribute( normalAttribute, vB );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::nC.fromBufferAttribute(...)` | `nC.fromBufferAttribute( normalAttribute, vC );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::morphArray.push(...)` | `morphArray.push( newAttribute );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::indexArray.push(...)` | `indexArray.push( indexRow );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_v0.fromBufferAttribute(...)` | `_v0.fromBufferAttribute( positionAttr, index0 );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_v1.fromBufferAttribute(...)` | `_v1.fromBufferAttribute( positionAttr, index1 );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::uvBuffer.push(...)` | `uvBuffer.push( u, 1 - v );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xxe-injection::DOMParser(...)` | `const parser = new DOMParser();` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xxe-injection::bufferGeometryLoader.parse(...)` | `geometry = bufferGeometryLoader.parse( data );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xxe-injection::AnimationClip.parse(...)` | `const clip = AnimationClip.parse( data );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unsafe-deserialization::node.deserialize(...)` | `node.deserialize( json );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_testAxis.fromArray(...)` | `_testAxis.fromArray( axes, i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::if(...)` | `if ( t < 2 / 3 ) return p + ( q - p ) * 6 * ( 2 / 3 - t );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::hue2rgb(...)` | `this.r = hue2rgb( q, p, h + 1 / 3 );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::obj[<ident>]` | `tPrev = t0 + pp[ iPrev ] - pp[ iPrev + 1 ];` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::obj[<numeric literal>]` | `tNext = t1 + pp[ 1 ] - pp[ 0 ];` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::this.getType(...)` | `return this.getType( type ) + '[ ' + count + ' ]';` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::stack.split(...)` | `return stack.split( '\n' )` |
| 1 | ⚠️ unlabelled | `secure-coding/no-ldap-injection::inputsCode.trim(...)` | `let declarationCode = ${ type } ${ name } ( ${ inputsCode.tr` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::ArrayElementNode(...)` | `element = new ArrayElementNode( this, new ConstNode( i, 'uin` |
| 1 | ⚠️ unlabelled | `secure-coding/detect-object-injection::nodeObject(...)` | `node = nodeObject( Object.assign( node, settings ) );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::params.concat(...)` | `return params.concat( new Array( minParams - params.length )` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::box.expandByPoint(...)` | `box.expandByPoint( _vector.fromBufferAttribute( position, iv` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_vStart.fromBufferAttribute(...)` | `_vStart.fromBufferAttribute( positionAttribute, i - 1 );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_vEnd.fromBufferAttribute(...)` | `_vEnd.fromBufferAttribute( positionAttribute, i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_start.fromBufferAttribute(...)` | `_start.fromBufferAttribute( positionAttribute, i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_end.fromBufferAttribute(...)` | `_end.fromBufferAttribute( positionAttribute, i + 1 );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_tempA.fromBufferAttribute(...)` | `_tempA.fromBufferAttribute( morphAttribute, index );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::_offsetMatrix.toArray(...)` | `_offsetMatrix.toArray( boneMatrices, i * 16 );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::data.boneInverses.push(...)` | `data.boneInverses.push( boneInverse.toArray() );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::vector.fromBufferAttribute(...)` | `vector.fromBufferAttribute( skinWeight, i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this.backend.createUniformBuffer(...)` | `this.backend.createUniformBuffer( binding );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this.info.createUniformBuffer(...)` | `this.info.createUniformBuffer( binding );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this.backend.destroyUniformBuffer(...)` | `this.backend.destroyUniformBuffer( binding );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this.info.destroyUniformBuffer(...)` | `this.info.destroyUniformBuffer( binding );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::vertexBuffers.add(...)` | `vertexBuffers.add( bufferAttribute );` |
| 1 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::this.getDynamicCacheKey(...)` | `return /*this.object.static !== true &&*/ ( this.initialNode` |
| 1 | ⚠️ unlabelled | `compat/compat::other` | `this._supportsLayers = ( this._supportsGlBinding && 'createP` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::layersArray.unshift(...)` | `layersArray.unshift( layer.xrlayer );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::gl.disableVertexAttribArray(...)` | `gl.disableVertexAttribArray( i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::plane.normal.toArray(...)` | `plane.normal.toArray( dstArray, i4 );` |
| 1 | ⚠️ unlabelled | `secure-coding/detect-object-injection::properties.get(...)` | `properties.get( object )[ key ] = value;` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::renderer.renderBufferDirect(...)` | `renderer.renderBufferDirect( shadowCamera, null, geometry, d` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::setupFrameBufferTexture(...)` | `setupFrameBufferTexture( renderTargetProperties.__webglFrame` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::invalidationArrayDraw.push(...)` | `invalidationArrayDraw.push( depthStyle );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::PureArrayUniform(...)` | `new PureArrayUniform( id, activeInfo, addr ) );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::allocatedBindingPoints.push(...)` | `allocatedBindingPoints.push( i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this.textureUtils.copyBufferToTexture(...)` | `this.textureUtils.copyBufferToTexture( dualAttributeData.tra` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::dualAttributeData.switchBuffers(...)` | `dualAttributeData.switchBuffers();` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::gl.createBuffer(...)` | `const bufferGPU = gl.createBuffer();` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::transformBuffers.push(...)` | `transformBuffers.push( attributeData );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::isTypedArray(...)` | `const isTyped = isTypedArray( array );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::invalidationArray.push(...)` | `invalidationArray.push( gl.COLOR_ATTACHMENT0 + i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::gl.enableVertexAttribArray(...)` | `gl.enableVertexAttribArray( i );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::gl.bindBufferBase(...)` | `gl.bindBufferBase( gl.TRANSFORM_FEEDBACK_BUFFER, i, attribut` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::state.bindBufferBase(...)` | `state.bindBufferBase( gl.UNIFORM_BUFFER, index, bindingData.` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::drawBuffersIndexedExt.blendFuncSeparateiOES(...)` | `drawBuffersIndexedExt.blendFuncSeparateiOES( i, gl.ONE, gl.Z` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::passEncoderGPU.setVertexBuffer(...)` | `passEncoderGPU.setVertexBuffer( i, buffer );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::paddedArray.set(...)` | `paddedArray.set( array.subarray( i * itemSize, i * itemSize` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this._getBufferAttribute(...)` | `const bufferAttribute = this._getBufferAttribute( geometryAt` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::vertexBuffers.get(...)` | `let vertexBufferLayout = vertexBuffers.get( bufferAttribute` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::vertexBuffers.set(...)` | `vertexBuffers.set( bufferAttribute, vertexBufferLayout );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::vertexBufferLayout.attributes.push(...)` | `vertexBufferLayout.attributes.push( {` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::joint.matrix.fromArray(...)` | `joint.matrix.fromArray( jointPose.transform.matrix );` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::SortableSet(...)` | `innerSet = new SortableSet();` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::join(...)` | `(fs.readdir)(join(fs, outputPath, directory), (err, entries)` |
| 1 | ⚠️ unlabelled | `node-security/no-arbitrary-file-access::other` | `(fs.readdir)(path, (err, _entries) => {` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.rmdir(...)` | `fs.rmdir(path, (err) => {` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.unlink(...)` | `fs.unlink(path, (err) => {` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::this._assetsRelatedIn.set(...)` | `this._assetsRelatedIn.set(name, (relatedIn = new Map()));` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::relatedIn.set(...)` | `relatedIn.set(key, (entry = new Set()));` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Array.from(...)` | `const asyncDeps = Array.from(` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.readdir(...)` | `fs.readdir(directory, (err, files) => {` |
| 1 | ⚠️ unlabelled | `node-security/no-arbitrary-file-access::fs.readdir(...)` | `fs.readdir(directory, (err, files) => {` |
| 1 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::JSON.stringify(...)` | `return ${key === "__proto__" ? '["__proto__"]' : JSON.string` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unsafe-regex-construction::other` | `${RuntimeGlobals.require}\\s*(!?\\.)` |
| 1 | ⚠️ unlabelled | `jsdoc/ts-no-empty-object-type::other` | `// eslint-disable-next-line jsdoc/ts-no-empty-object-type` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xxe-injection::toString(...)` | `(content).toString("utf8")` |
| 1 | ⚠️ unlabelled | `node-security/no-timing-unsafe-compare::Number(...)` | `chunkId = ${Number(key)} === key ? Number(key) : key;` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unsafe-regex-construction::Array.isArray(...)` | `(?:\\.${Array.isArray(value) ? (${value.join("")}) : value})` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::compiler.outputPath.indexOf(...)` | `compiler.outputPath.indexOf(commonPath) !== 0 &&` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::WeakSet(...)` | `? ((this._addedSideEffectsBailout = new WeakSet()), true)` |
| 1 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::hash(...)` | `const FULLHASH_REGEXP = /\[(?:full)?hash(?::\d+)?\]/;` |
| 1 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::test(...)` | `/\[(?:full)?hash\]/.test(publicPath)` |
| 1 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::iu.test(...)` | `/^(?:[_\p{L}][_0-9\p{L}]*)?\(.*\)$/iu.test(trimmed)` |
| 1 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::contenthash(...)` | `const CONTENT_HASH_DETECT_REGEXP = /\[contenthash(?::\w+)?\]` |
| 1 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::id.replace(...)` | `return id.replace(/(^[.-][^a-z0-9_-])+/gi, "_");` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::skipConnectionBuffer.push(...)` | `skipConnectionBuffer.push([refModule, connections]);` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::skipBuffer.push(...)` | `skipBuffer.push(refModule);` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::queueBuffer.push(...)` | `queueBuffer.push({` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::blocksByChunkGroups.set(...)` | `blocksByChunkGroups.set(info, (blocks = new Set()));` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::process(...)` | `process(block, new Set());` |
| 1 | ⚠️ unlabelled | `secure-coding/detect-non-literal-regexp::obj[<numeric literal>]` | `return new RegExp(match[1], match[2]);` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::if(...)` | `if (fs.statSync(path.join(dir, "package.json")).isFile()) br` |
| 1 | ⚠️ unlabelled | `node-security/no-zip-slip::obj[<string literal>]` | `/** @type {NonNullable<FileCacheOptions["name"]>} */ (cache.` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::JSON.parse(...)` | `const packageInfo = JSON.parse(fs.readFileSync(pkgPath, "utf` |
| 1 | ⚠️ unlabelled | `node-security/no-arbitrary-file-access::JSON.parse(...)` | `const packageInfo = JSON.parse(fs.readFileSync(pkgPath, "utf` |
| 1 | ⚠️ unlabelled | `secure-coding/detect-object-injection::Boolean(...)` | `(result)[key] = hasFalse && hasTrue ? null : Boolean(hasTrue` |
| 1 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::u0020(...)` | `/(^\\+)?(\\[A-F0-9]{1,6})\u0020(?![a-fA-F0-9\u0020])/g;` |
| 1 | ⚠️ unlabelled | `node-security/no-zip-slip::path.resolve(...)` | `path.resolve(module.context, parsedRequest.path) ===` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::input.charCodeAt(...)` | `input.charCodeAt(pos) === CC_SOLIDUS &&` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::_isWhiteSpace(...)` | `_isWhiteSpace(input.charCodeAt(pos)) &&` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.createWriteStream(...)` | `const fsStream = fs.createWriteStream(outputPath);` |
| 1 | ⚠️ unlabelled | `secure-coding/no-redos-vulnerable-regex::replace(...)` | `.replace(/^([.-][^a-z0-9_-])+/i, "")` |
| 1 | ⚠️ unlabelled | `secure-coding/no-ldap-injection::reexport(...)` | `const key = harmony reexport (checked) ${importVar} ${name};` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::AppendOnlyStackedSet(...)` | `: new AppendOnlyStackedSet();` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::require(...)` | `"[HMR] unexpected require(" +` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::fs.writeFile(...)` | `fs.writeFile(this.options.path, JSON.stringify(json), callba` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unsafe-regex-construction::Array.from(...)` | `Array.from(hashToAssets.keys(), quoteMeta).join(""),` |
| 1 | ⚠️ unlabelled | `node-security/no-ssrf::other` | `request` |
| 1 | ⚠️ unlabelled | `secure-coding/no-xpath-injection::obj[<string literal>]` | `validUntil = requestTime + Number(parsed["max-age"]) * 1000;` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::currentBuffer.writeDoubleLE(...)` | `currentBuffer.writeDoubleLE(` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::ensureBuffer(...)` | `ensureBuffer();` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::content.push(...)` | `content.push(retainedBuffer(buf));` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::readDoubleLE(...)` | `/** @type {Buffer} */ (currentBuffer).readDoubleLE(` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::serialize(...)` | `serialize(` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::lastBuffers.push(...)` | `lastBuffers.push(item);` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::Buffer.concat(...)` | `contentItem = Buffer.concat(buffers, n);` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::nameBuffer.toString(...)` | `const name = nameBuffer.toString();` |
| 1 | ⚠️ unlabelled | `node-security/no-unsafe-buffer-alloc::Buffer.allocUnsafeSlow(...)` | `currentBuffer = Buffer.allocUnsafeSlow(` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unsafe-deserialization::then(...)` | `(r).then((data) => deserialize(data))` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::initCodePerScope.set(...)` | `initCodePerScope.set(shareScope, (stages = new Map()));` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::stages.set(...)` | `stages.set(initStage  0, (list = new Set()));` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::obj[<arithmetic expr>]` | `this._caches[/** @type {keyof StatsFactoryHooks} */ (key)] =` |
| 1 | ⚠️ unlabelled | `unicorn/no-array-for-each::other` | `// eslint-disable-next-line unicorn/no-array-for-each, unico` |
| 1 | ⚠️ unlabelled | `unicorn/no-array-method-this-argument::other` | `// eslint-disable-next-line unicorn/no-array-for-each, unico` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::map.set(...)` | `map.set(arg, (map = new Map()));` |
| 1 | ⚠️ unlabelled | `node-security/detect-eval-with-expression::Function(...)` | `const result = new Function(fnSource);` |
| 1 | ⚠️ unlabelled | `node-security/no-weak-hash-algorithm::createHash(...)` | `(crypto).createHash("md4")` |
| 1 | ⚠️ unlabelled | `node-security/no-dynamic-algorithm-selection::createHash(...)` | `(crypto).createHash(algorithm)` |
| 1 | ⚠️ unlabelled | `n/no-deprecated-api::other` | `// eslint-disable-next-line n/no-deprecated-api` |
| 1 | ⚠️ unlabelled | `node-security/detect-non-literal-fs-filename::obj[<string literal>]` | `return /** @type {NonNullable<InputFileSystem["lstat"]>} */` |
| 1 | ⚠️ unlabelled | `unicorn/text-encoding-identifier-case::other` | `// eslint-disable-next-line unicorn/text-encoding-identifier` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unlimited-resource-allocation::startEndBuffer.push(...)` | `startEndBuffer.push(read(), read());` |
| 1 | ⚠️ unlabelled | `secure-coding/no-unchecked-loop-condition::other` | `ver.length &&` |
| 1 | ⚠️ unlabelled | `secure-coding/no-ldap-injection::other` | `internalSerializables[` |

## Open FP classes (the work list)

- **66× `node-security/no-buffer-overread::obj[<arithmetic expr>]`** — Fires on plain JS array indexing such as \`const timeNext = times\[i + 1\]\` inside a bounded \`for\` loop in three.js KeyframeTrack. \`times\` is a keyframe Float32Array, not a Node Buffer — the only 'Buffer' identifiers in three.js are WebGPU GPUBuffer. A buffer-overread rule must key off an actual Buffer/DataView receiver before reporting.
- **55× `secure-coding/detect-object-injection::obj[<arithmetic expr>]`** — Array index arithmetic over identifiers, e.g. \`targetTrack.values\[valueStart + k\]\`. The result is numeric in every real path, so it can never be '\_\_proto\_\_'/'prototype'/'constructor', but \`+\` between two identifiers is not provably numeric from the expression alone. Closing this needs the operands' numeric-ness resolved through scope analysis (the generalisation of the existing isLoopCounterIdentifier) rather than a suppression.
- **47× `node-security/no-buffer-overread::obj[<ident>]`** — Same root cause as the arithmetic variant: \`const time = times\[i\]\` on an ordinary array. Reporting requires evidence the receiver is a Node Buffer or DataView; a bare identifier index on an unknown object is not that evidence.

