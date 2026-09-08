"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownParserService = void 0;
var core_1 = require("@angular/core");
var MarkdownParserService = function () {
    var _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MarkdownParserService = _classThis = /** @class */ (function () {
        function MarkdownParserService_1() {
        }
        MarkdownParserService_1.prototype.readMarkdownFile = function (file) {
            return new Promise(function (resolve, reject) {
                var reader = new FileReader();
                reader.onload = function (e) { var _a; return resolve(((_a = e.target) === null || _a === void 0 ? void 0 : _a.result) || ''); };
                reader.onerror = function (err) { return reject(err); };
                reader.readAsText(file);
            });
        };
        MarkdownParserService_1.prototype.parseMarkdownToQuestions = function (markdownText) {
            if (!markdownText)
                return [];
            var questions = [];
            var lines = markdownText.split(/\r?\n/);
            var currentQText = '';
            var currentChoices = [];
            var currentCorrectAnswers = [];
            var currentExplanation = null;
            var hasCurrentHeader = false;
            var optionIndex = 0;
            var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            var arabicChoiceMap = {
                'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
                'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
            };
            var isFooterOrExaminerText = function (text) {
                var norm = text.toLowerCase().trim();
                var footerKeywords = [
                    'إعداد', 'اعداد', 'إشراف', 'اشراف', 'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة',
                    'توقيع', 'عضو اللجنة', 'الممتحن', 'المراجع', 'اللجنة الامتحانية', 'لجنة الاختبار',
                    'مع تمنياتنا', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله', 'النتيجة النهائية',
                    'ملاحظات', 'اسم المراجع', 'رقم البند', 'رقم الصفحة', 'اسم المرجع', 'رئيس قاطع', 'مشرف الدور', 'قائد المركز',
                    'examiner', 'signature', 'prepared by', 'approved by', 'committee'
                ];
                if (footerKeywords.some(function (kw) { return norm.startsWith(kw) || (norm.length < 80 && norm.includes(kw)); })) {
                    return true;
                }
                var militaryRankRegex = /(?:^|\s)(?:عميد|عقيد|مقدم|رائد|نقيب|ملازم|لواء|فريق|مشير)(?:\s+أ\s*\.?\s*ح)?\s*[\/\s]/i;
                return militaryRankRegex.test(norm);
            };
            var saveCurrentQuestion = function () {
                var _a;
                var qTextClean = currentQText.trim();
                if (!qTextClean)
                    return;
                // Ignore intro/footer text that has no header AND no explicit choices
                if (!hasCurrentHeader && currentChoices.length === 0) {
                    currentQText = '';
                    return;
                }
                // Clean HTML comment tags if present
                qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
                // Remove leading # symbols or "#### السؤال 1" if qText starts with header
                qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*/i, '').trim();
                if (qTextClean && !isFooterOrExaminerText(qTextClean)) {
                    var choices = __spreadArray([], currentChoices, true);
                    // If no explicit choices found, check if it's a True/False question or fallback
                    if (choices.length === 0) {
                        choices = [
                            { id: 'A', label: 'A', text: 'صح / True' },
                            { id: 'B', label: 'B', text: 'خطأ / False' }
                        ];
                    }
                    var type = currentCorrectAnswers.length > 1 ? 'multiple' : 'single';
                    var finalCorrect = currentCorrectAnswers.length === 1
                        ? currentCorrectAnswers[0]
                        : (currentCorrectAnswers.length > 1 ? currentCorrectAnswers : (((_a = choices[0]) === null || _a === void 0 ? void 0 : _a.id) || 'A'));
                    questions.push({
                        id: "md_q_".concat(questions.length + 1),
                        text: qTextClean,
                        choices: choices,
                        correctAnswer: finalCorrect,
                        type: type,
                        explanation: currentExplanation ? currentExplanation.trim() : null,
                        difficulty: null,
                        userAnswer: null
                    });
                }
                currentQText = '';
                currentChoices = [];
                currentCorrectAnswers = [];
                currentExplanation = null;
                optionIndex = 0;
            };
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line)
                    continue;
                // Ignore HTML comments like <!-- converted from ... -->
                if (line.startsWith('<!--') && line.endsWith('-->'))
                    continue;
                // Clean line without bold asterisks/underscores for pattern testing
                var cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();
                // Check for Question Header: #### السؤال 1 , 1. , س1: , Q1: , السؤال 1:
                var qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
                var isHeader = !!qHeaderMatch && (line.startsWith('#') ||
                    /^(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
                    /^\d+[\.\-\)]/i.test(line));
                // Check for Answer key line: **الإجابة:** A or Answer: A,C or الإجابة: صح
                var answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);
                // Check for Explanation line: > Explanation text or Explanation: text or الشرح: text
                var expMatch = cleanLine.match(/^(?:>\s*|(?:Explanation|الشرح|التفسير)[:\s]+)(.+)$/i);
                // Enhanced Choice matching to support [ الإجابة الصحيحة ] marker even with no spaces
                var isCorrectChoice = false;
                var cleanLineForChoice = line;
                var lineNoSpaces = cleanLineForChoice.replace(/\s+/g, '');
                if (lineNoSpaces.includes('الإجابةالصحيحة') || lineNoSpaces.includes('اإلجابةالصحيحة')) {
                    isCorrectChoice = true;
                    // Remove the marker, being resilient to missing spaces and flipped brackets
                    cleanLineForChoice = cleanLineForChoice.replace(/^[^()]*?(الإجابة|اإلجابة)[^()]*?(الصحيحة|لصحيحة)[^()]*?[\]\[]/g, '').trim();
                    cleanLineForChoice = cleanLineForChoice.replace(/^[-—\s\[\]]+/, '').trim();
                }
                else if (cleanLineForChoice.match(/\[[xX]\]/)) {
                    isCorrectChoice = true;
                }
                cleanLineForChoice = cleanLineForChoice.replace(/^[-—]\s*/, '').trim();
                // Check for Choice line: - (أ) text or - A. text or (أ) text or )أ( text
                var choiceMatch = cleanLineForChoice.match(/^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/);
                if (isHeader && !choiceMatch && !answerKeyMatch) {
                    saveCurrentQuestion();
                    hasCurrentHeader = true;
                    currentQText = qHeaderMatch ? qHeaderMatch[1].trim() : cleanLine.replace(/^#+\s*/, '').trim();
                    currentChoices = [];
                    currentCorrectAnswers = [];
                    currentExplanation = null;
                    optionIndex = 0;
                }
                else if (answerKeyMatch) {
                    var rawAns = answerKeyMatch[1].trim();
                    if (rawAns === 'صح' || rawAns.toLowerCase() === 'true' || rawAns === 'نعم') {
                        currentCorrectAnswers.push('A');
                    }
                    else if (rawAns === 'خطأ' || rawAns.toLowerCase() === 'false' || rawAns === 'لا') {
                        currentCorrectAnswers.push('B');
                    }
                    else {
                        var parts = rawAns.split(/[,;\s\u060C]+/);
                        parts.forEach(function (p) {
                            var cleanP = p.trim().toUpperCase();
                            if (arabicChoiceMap[cleanP]) {
                                cleanP = arabicChoiceMap[cleanP];
                            }
                            if (cleanP) {
                                currentCorrectAnswers.push(cleanP);
                            }
                        });
                    }
                }
                else if (expMatch) {
                    currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + expMatch[1].trim();
                }
                else if (choiceMatch) {
                    var label = choiceMatch[1].toUpperCase();
                    if (arabicChoiceMap[label]) {
                        label = arabicChoiceMap[label];
                    }
                    var choiceText = choiceMatch[2].replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').trim();
                    // Clean up trailing dashes
                    choiceText = choiceText.replace(/[—\-\s]+$/, '');
                    // Extract explanation if present at the end of the choice (e.g. from PDF: (المرجع، ص 333))
                    if (isCorrectChoice || choiceText.includes('المرجع')) {
                        var explanationMatch = choiceText.match(/(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/);
                        if (explanationMatch) {
                            choiceText = explanationMatch[1].replace(/[—\-\s]+$/, '').trim();
                            var exp = explanationMatch[2].replace(/[\)\(\]\[]\s*$/, '').trim();
                            currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + exp;
                        }
                    }
                    var isChecked = isCorrectChoice;
                    if (line.includes('[x]') || line.includes('[X]')) {
                        isChecked = true;
                    }
                    var choiceId = label;
                    currentChoices.push({
                        id: choiceId,
                        label: choiceId,
                        text: choiceText
                    });
                    if (isChecked) {
                        currentCorrectAnswers.push(choiceId);
                    }
                    optionIndex++;
                }
                else if (!line.startsWith('#')) {
                    var cleanContent = line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
                    if (cleanContent) {
                        if (currentChoices.length > 0) {
                            if (currentExplanation && (currentExplanation.includes('المرجع') || currentExplanation.includes('ص '))) {
                                var cleanExpLine = cleanContent.replace(/[\)\(\]\[]\s*$/, '');
                                currentExplanation += ' ' + cleanExpLine;
                            }
                            else {
                                var lastChoice = currentChoices[currentChoices.length - 1];
                                lastChoice.text += ' ' + cleanContent;
                                var expRegex = /(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/;
                                var expMatch_1 = lastChoice.text.match(expRegex);
                                if (expMatch_1) {
                                    lastChoice.text = expMatch_1[1].replace(/[—\-\s]+$/, '').trim();
                                    currentExplanation = expMatch_1[2].replace(/[\)\(\]\[]\s*$/, '').trim();
                                }
                            }
                        }
                        else {
                            currentQText = (currentQText ? currentQText + '\n' : '') + cleanContent;
                        }
                    }
                }
            }
            saveCurrentQuestion();
            return questions;
        };
        MarkdownParserService_1.prototype.convertMarkdownToExcelData = function (fileName, fileSize, markdownText) {
            var questions = this.parseMarkdownToQuestions(markdownText);
            var headers = ['مسلسل', 'نص السؤال', 'الإجابة الصحيحة', 'الخيار أ (A)', 'الخيار ب (B)', 'الخيار ج (C)', 'الخيار د (D)', 'الشرح'];
            var rows = questions.map(function (q, idx) {
                var _a, _b, _c, _d;
                var row = [];
                row[0] = idx + 1;
                row[1] = q.text;
                row[2] = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(';') : q.correctAnswer;
                row[3] = ((_a = q.choices[0]) === null || _a === void 0 ? void 0 : _a.text) || '';
                row[4] = ((_b = q.choices[1]) === null || _b === void 0 ? void 0 : _b.text) || '';
                row[5] = ((_c = q.choices[2]) === null || _c === void 0 ? void 0 : _c.text) || '';
                row[6] = ((_d = q.choices[3]) === null || _d === void 0 ? void 0 : _d.text) || '';
                row[7] = q.explanation || '';
                return row;
            });
            var sheet = {
                name: fileName.replace(/\.(md|markdown)$/i, ''),
                index: 0,
                rowCount: rows.length,
                colCount: headers.length,
                headers: headers,
                rows: rows,
                fileName: fileName
            };
            return {
                fileName: fileName,
                fileSize: fileSize,
                sheets: [sheet],
                selectedSheet: 0
            };
        };
        return MarkdownParserService_1;
    }());
    __setFunctionName(_classThis, "MarkdownParserService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MarkdownParserService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MarkdownParserService = _classThis;
}();
exports.MarkdownParserService = MarkdownParserService;
