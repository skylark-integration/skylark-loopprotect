define([],function(){
  /*global DEBUG*/
  'use strict';
  var debug = null;

  // the standard loops - note that recursive is not supported
  var re = /\b(for|while|do)\b/g;
  var reSingle = /\b(for|while|do)\b/;
  var labelRe = /\b(?!default:)([a-z_]{1}\w+:)/i;
  var comments = /(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm;

  var loopProtect = rewriteLoops;

  // used in the loop detection
  loopProtect.counters = {};

  // expose debug info
  loopProtect.debug = function debugSwitch(state) {
    debug = state ? function () {
      console.log.apply(console, [].slice.apply(arguments));
    } : function () {};
  };

  loopProtect.debug(false); // off by default

  // the method - as this could be aliased to something else
  loopProtect.alias = 'loopProtect';

  function inMultilineComment(lineNum, lines) {
    if (lineNum === 0) {
      return false;
    }

    var j = lineNum;
    var closeCommentTags = 1; // let's assume we're inside a comment
    var closePos = -1;
    var openPos = -1;

    do {
      debug('looking backwards ' + lines[j]); // jshint ignore:line
      closePos = lines[j].indexOf('*/');
      openPos = lines[j].indexOf('/*');

      if (closePos !== -1) {
        closeCommentTags++;
      }

      //check for single line /* comment */ formatted comments.
      if (closePos === lines[j].length - 2 && openPos !== -1) {
        closeCommentTags--;
      }

      if (openPos !== -1) {
        closeCommentTags--;

        if (closeCommentTags === 0) {
          debug('- exit: part of a multiline comment'); // jshint ignore:line
          return true;
        }
      }
      j -= 1;
    } while (j !== 0);

    return false;
  }

  function inCommentOrString(index, line) {
    var character;
    while (--index > -1) {
      character = line.substr(index, 1);
      if (character === '"' || character === '\'' || character === '.') {
        // our loop keyword was actually either in a string or a property, so let's exit and ignore this line
        debug('- exit: matched inside a string or property key'); // jshint ignore:line
        return true;
      }
      if (character === '/' || character === '*') {
        // looks like a comment, go back one to confirm or not
        --index;
        if (character === '/') {
          // we've found a comment, so let's exit and ignore this line
          debug('- exit: part of a comment'); // jshint ignore:line
          return true;
        }
      }
    }
    return false;
  }

  function directlyBeforeLoop(index, lineNum, lines) {
    reSingle.lastIndex = 0;
    labelRe.lastIndex = 0;
    var beforeLoop = false;

    var theRest = lines.slice(lineNum).join('\n').substr(index).replace(labelRe, '');
    theRest.replace(reSingle, function commentStripper(match, capture, i) {
      var target = theRest.substr(0, i).replace(comments, '').trim();
      debug('- directlyBeforeLoop: ' + target); // jshint ignore:line
      if (target.length === 0) {
        beforeLoop = true;
      }
      // strip comments out of the target, and if there's nothing else
      // it's a valid label...I hope!
    });

    return beforeLoop;
  }

  /**
   * Look for for, while and do loops, and inserts *just* at the start of the
   * loop, a check function.
   */
  function rewriteLoops(code, offset) {
    var recompiled = [];
    var lines = code.split('\n');
    var disableLoopProtection = false;
    var method = loopProtect.alias + '.protect';
    var ignore = {};
    var pushonly = {};
    var labelPostion = null;

    function insertReset(lineNum, line, matchPosition) {
      // recompile the line with the reset **just** before the actual loop
      // so that we insert in to the correct location (instead of possibly
      // outside the logic
      // wrap reset and loop in a block to avoid one line loop behind
      // `if (false)`, insert the open brace in this function, and the close
      // brace after loop close brace.
      return line.slice(0, matchPosition) + '{;' + method + '({ line: ' + lineNum + ', reset: true }); ' + line.slice(matchPosition);
    }

    if (!offset) {
      offset = 0;
    }

    lines.forEach(function eachLine(line, lineNum) {
      // reset our regexp each time.
      re.lastIndex = 0;
      labelRe.lastIndex = 0;

      if (disableLoopProtection) {
        return;
      }

      if (line.toLowerCase().indexOf('noprotect') !== -1) {
        disableLoopProtection = true;
      }

      var index = -1;
      var matchPosition = -1;
      var originalLineNum = lineNum;
      // +1 since we're humans and don't read lines numbers from zero
      var printLineNumber = lineNum - offset + 1;
      var character = '';
      // special case for `do` loops, as they're end with `while`
      var dofound = false;
      var findwhile = false;
      var terminator = false;
      var matches = line.match(re) || [];
      var match = matches.length ? matches[0] : '';
      var labelMatch = line.match(labelRe) || [];
      var openBrackets = 0;
      var openBraces = 0;
      var foundLoopEnd = false;

      if (labelMatch.length) {
        debug('- label match'); // jshint ignore:line
        index = line.indexOf(labelMatch[1]);
        if (!inCommentOrString(index, line)) {
          if (!inMultilineComment(lineNum, lines)) {
            if (directlyBeforeLoop(index, lineNum, lines)) {
              debug('- found a label: "' + labelMatch[0] + '"'); // jshint ignore:line
              labelPostion = lineNum;
            } else {
              debug('- ignored "label", false positive'); // jshint ignore:line
            }
          } else {
            debug('- ignored label in multline comment'); // jshint ignore:line
          }
        } else {
          debug('- ignored label in string or comment'); // jshint ignore:line
        }
      }

      if (ignore[lineNum]) {
        debug(' -exit: ignoring line ' + lineNum +': ' + line); // jshint ignore:line
        return;
      }

      if (pushonly[lineNum]) {
        debug('- exit: ignoring, but adding line ' + lineNum + ': ' + line); // jshint ignore:line
        recompiled.push(line);
        return;
      }

      // if there's more than one match, we just ignore this kind of loop
      // otherwise I'm going to be writing a full JavaScript lexer...and god
      // knows I've got better things to be doing.
      if (match && matches.length === 1 && line.indexOf('jsbin') === -1) {
        debug('match on ' + match + '\n'); // jshint ignore:line

        // there's a special case for protecting `do` loops, we need to first
        // prtect the `do`, but then ignore the closing `while` statement, so
        // we reset the search state for this special case.
        dofound = match === 'do';

        // make sure this is an actual loop command by searching backwards
        // to ensure it's not a string, comment or object property
        matchPosition = index = line.indexOf(match);

        // first we need to walk backwards to ensure that our match isn't part
        // of a string or part of a comment
        if (inCommentOrString(index, line)) {
          recompiled.push(line);
          return;
        }

        // it's quite possible we're in the middle of a multiline
        // comment, so we'll cycle up looking for an opening comment,
        // and if there's one (and not a closing `*/`), then we'll
        // ignore this line as a comment
        if (inMultilineComment(lineNum, lines)) {
          recompiled.push(line);
          return;
        }

        // now work our way forward to look for '{'
        index = line.indexOf(match) + match.length;

        if (index === line.length) {
          if (index === line.length && lineNum < (lines.length-1)) {
            // move to the next line
            debug('- moving to next line'); // jshint ignore:line
            recompiled.push(line);
            lineNum++;
            line = lines[lineNum];
            ignore[lineNum] = true;
            index = 0;
          }

        }

        while (index < line.length) {
          character = line.substr(index, 1);
          // debug(character, index); // jshint ignore:line

          if (character === '(') {
            openBrackets++;
          }

          if (character === ')') {
            openBrackets--;

            if (openBrackets === 0 && terminator === false) {
              terminator = index;
            }
          }

          if (character === '{') {
            openBraces++;
          }

          if (character === '}') {
            openBraces--;
          }

          if (openBrackets === 0 && (character === ';' || character === '{')) {
            // if we're a non-curlies loop, then convert to curlies to get our code inserted
            // add a close brace after loop to match the open brace before reset
            if (character === ';') {
              if (lineNum !== originalLineNum) {
                debug('- multiline inline loop'); // jshint ignore:line
                // affect the compiled line
                recompiled[originalLineNum] = recompiled[originalLineNum].substring(0, terminator + 1) + '{\nif (' + method + '({ line: ' + printLineNumber + ' })) break;\n' + recompiled[originalLineNum].substring(terminator + 1);
                line += '\n}}\n';
              } else {
                // simpler
                debug('- single line inline loop'); // jshint ignore:line
                line = line.substring(0, terminator + 1) + '{\nif (' + method + '({ line: ' + printLineNumber + ' })) break;\n' + line.substring(terminator + 1) + '\n}}\n';
              }
              foundLoopEnd = true;
            } else if (character === '{') {
              debug('- multiline with braces'); // jshint ignore:line
              var insert = ';\nif (' + method + '({ line: ' + printLineNumber + ' })) break;\n';
              line = line.substring(0, index + 1) + insert + line.substring(index + 1);

              index += insert.length;
            }

            // work out where to put the reset
            if (lineNum === originalLineNum && labelPostion === null) {
              debug('- simple reset insert'); // jshint ignore:line
              line = insertReset(printLineNumber, line, matchPosition);
              index += (';' + method + '({ line: ' + lineNum + ', reset: true }); ').length;
            } else {
              // insert the reset above the originalLineNum OR if this loop used
              // a label, we have to insert the reset *above* the label
              if (labelPostion === null) {
                debug('- reset inserted above original line'); // jshint ignore:line
                recompiled[originalLineNum] = insertReset(printLineNumber, recompiled[originalLineNum], matchPosition);
              } else {
                debug('- reset inserted above matched label on line ' + labelPostion); // jshint ignore:line
                if (recompiled[labelPostion] === undefined) {
                  labelPostion--;
                  matchPosition = 0;
                }
                recompiled[labelPostion] = insertReset(printLineNumber, recompiled[labelPostion], matchPosition);
                labelPostion = null;
              }
            }

            if (!dofound) {
              if (foundLoopEnd) {
                recompiled.push(line);
                return;
              }

              debug('searching for closing brace of loop for: ' + line); // jshint ignore:line
              while (line !== null) {
                character = line.substr(index, 1);

                debug(index, character, openBraces); // jshint ignore:line

                if (character === '{') {
                  openBraces++;
                }

                if (character === '}') {
                  openBraces--;
                  if (openBraces === 0) {
                    debug('outside of loop, add a close brace to: ' + line); // jshint ignore:line
                    line = line.substring(0, index+1) + '}' + line.substring(index+1);
                    recompiled.push(line);
                    ignore[lineNum] = true;
                    return;
                  }
                }

                index++;

                if (index >= line.length) {
                  recompiled.push(line);
                  ignore[lineNum] = true;
                  lineNum++;
                  line = lines[lineNum];
                  debug(line); // jshint ignore:line
                  index = 0;
                }
              }
              return;
            } else {
              debug('searching for closing `while` statement for: ' + line); // jshint ignore:line
              // cycle forward until we find the close brace, after which should
              // be our while statement to ignore
              findwhile = false;
              while (index < line.length) {
                character = line.substr(index, 1);

                if (character === '{') {
                  openBraces++;
                }

                if (character === '}') {
                  openBraces--;
                }

                if (openBraces === 0) {
                  findwhile = true;
                } else {
                  findwhile = false;
                }

                if (openBraces === 0) {
                  debug('outside of closure, looking for `while` statement: ' + line); // jshint ignore:line
                }

                if (findwhile && line.indexOf('while') !== -1) {
                  debug('- exit as we found `while`: ' + line); // jshint ignore:line
                  // TODO: handle while statement in multiple lines
                  line += '}';
                  recompiled.push(line);
                  ignore[lineNum] = true;
                  return;
                }

                index++;

                if (index === line.length && lineNum < (lines.length-1)) {
                  recompiled.push(line);
                  ignore[lineNum] = true;
                  lineNum++;
                  line = lines[lineNum];
                  debug(line); // jshint ignore:line
                  index = 0;
                }
              }
              return;
            }
          }

          index++;

          if (index === line.length && lineNum < (lines.length-1)) {
            // move to the next line
            debug('- moving to next line'); // jshint ignore:line
            recompiled.push(line);
            lineNum++;
            line = lines[lineNum];
            ignore[lineNum] = true;
            index = 0;
          }
        }
      } else {
        // else we're a regular line, and we shouldn't be touched
        debug('regular line ' + line); // jshint ignore:line
        recompiled.push(line);
      }
    });

    debug('---- source ----'); // jshint ignore:line
    debug(code); // jshint ignore:line
    debug('---- rewrite ---'); // jshint ignore:line
    debug(recompiled.join('\n')); // jshint ignore:line
    debug(''); // jshint ignore:line

    return disableLoopProtection ? code : recompiled.join('\n');
  }

  /**
   * Injected code in to user's code to **try** to protect against infinite
   * loops cropping up in the code, and killing the browser. Returns true
   * when the loops has been running for more than 100ms.
   */
  loopProtect.protect = function protect(state) {
    loopProtect.counters[state.line] = loopProtect.counters[state.line] || {};
    var line = loopProtect.counters[state.line];
    var now = (new Date()).getTime();

    if (state.reset) {
      line.time = now;
      line.hit = 0;
      line.last = 0;
    }

    line.hit++;
    if ((now - line.time) > 100) {//} && line.hit !== line.last+1) {
      // We've spent over 100ms on this loop... smells infinite.
      loopProtect.hit(state.line);
      // Returning true prevents the loop running again
      return true;
    }
    line.last++;
    return false;
  };

  loopProtect.hit = function hit(line) {
    var msg = 'Exiting potential infinite loop at line ' + line + '. To disable loop protection: add "// noprotect" to your code';
    console.error(msg);
  };

  loopProtect.reset = function reset() {
    // reset the counters
    loopProtect.counters = {};
  };

  return loopProtect;

});
