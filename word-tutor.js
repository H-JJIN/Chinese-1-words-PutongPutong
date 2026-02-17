// ===== Chinese 1 Word Tutor - Main Logic =====
(function () {
    'use strict';

    // State
    let currentLesson = 0;
    let currentVocabIdx = 0;
    let vocabOrder = [];
    let autoPlayTimer = null;
    let hanziWriter = null;

    // Quiz states
    let quizPOrder = [];
    let quizPIdx = 0;
    let quizPCorrect = 0;
    let quizPTotal = 0;

    let quizKOrder = [];
    let quizKIdx = 0;
    let quizKCorrect = 0;
    let quizKTotal = 0;

    // Pronunciation state
    let pronOrder = [];
    let pronIdx = 0;
    let recognition = null;

    // DOM helpers
    const $ = (s, p) => (p || document).querySelector(s);
    const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

    // ===== Initialize =====
    function init() {
        buildLessonNav();
        setupTabs();
        setupVocabControls();
        setupStrokePanel();
        setupQuizPinyin();
        setupQuizKorean();
        setupPronunciation();
        setupInputHelpers();
        selectLesson(0);
    }

    // ===== Lesson Navigation =====
    function buildLessonNav() {
        const nav = $('.nav-scroll', $('#lesson-nav'));
        WORD_LESSONS.forEach((lesson, i) => {
            const btn = document.createElement('button');
            btn.className = 'lesson-btn' + (i === 0 ? ' active' : '');
            btn.textContent = `${lesson.id}과`;
            btn.title = `${lesson.title} ${lesson.titleKr}`;
            btn.onclick = () => selectLesson(i);
            nav.appendChild(btn);
        });
    }

    function selectLesson(idx) {
        currentLesson = idx;
        $$('.lesson-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
        loadLesson(WORD_LESSONS[idx]);
    }

    function loadLesson(lesson) {
        loadVocab(lesson);
        loadStrokeGrid(lesson);
        resetQuizPinyin(lesson);
        resetQuizKorean(lesson);
        loadPronunciation(lesson);
    }

    // ===== Tab System =====
    function setupTabs() {
        $$('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                $$('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                $$('.tab-panel').forEach(p => p.classList.remove('active'));
                $(`#panel-${btn.dataset.tab}`).classList.add('active');
            };
        });
    }

    // ===== TTS =====
    function speak(text, lang = 'zh-CN') {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = 0.8;
        u.pitch = 1;
        speechSynthesis.speak(u);
    }

    // ===== Vocabulary Cards =====
    function loadVocab(lesson) {
        const vocab = lesson.words;
        vocabOrder = vocab.map((_, i) => i);
        currentVocabIdx = 0;
        showVocabCard();
        buildVocabTable(vocab);
        updateProgress();
    }

    function showVocabCard() {
        const lesson = WORD_LESSONS[currentLesson];
        const vocab = lesson.words;
        const w = vocab[vocabOrder[currentVocabIdx]];
        if (!w) return;

        const card = $('#vocab-card');
        card.classList.remove('flipped');

        $('.card-chinese-big', card).textContent = w.chinese;
        $('.card-pinyin-front', card).textContent = w.pinyin;
        $('.card-chinese', card).textContent = w.chinese;
        $('.card-pinyin', card).textContent = w.pinyin;
        $('.card-korean', card).textContent = w.korean;
        $('.card-english', card).textContent = w.english;
        $('.card-pos-badge', card).textContent = getPosLabel(w.pos);

        $('#vocab-counter').textContent = `${currentVocabIdx + 1} / ${vocabOrder.length}`;
        updateProgress();
    }

    function getPosLabel(pos) {
        const labels = {
            '명': '명사', '동': '동사', '형': '형용사', '부': '부사',
            '대': '대명사', '조': '조사', '양': '양사', '개': '개사',
            '접': '접속사', '수': '수사', '능원': '능원동사', '조동': '조동사',
            '고유': '고유명사'
        };
        return labels[pos] || pos;
    }

    function setupVocabControls() {
        // Flip card
        $('#vocab-card').onclick = (e) => {
            if (e.target.closest('.speak-btn') || e.target.closest('.stroke-btn')) return;
            $('#vocab-card').classList.toggle('flipped');
        };

        // Speak button
        $('#vocab-card .speak-btn').onclick = (e) => {
            e.stopPropagation();
            const w = WORD_LESSONS[currentLesson].words[vocabOrder[currentVocabIdx]];
            speak(w.chinese);
        };

        // Stroke button on card
        $('#vocab-card .stroke-btn').onclick = (e) => {
            e.stopPropagation();
            const w = WORD_LESSONS[currentLesson].words[vocabOrder[currentVocabIdx]];
            // Switch to stroke tab
            $$('.tab-btn').forEach(b => b.classList.remove('active'));
            $$('.tab-btn')[1].classList.add('active');
            $$('.tab-panel').forEach(p => p.classList.remove('active'));
            $('#panel-stroke').classList.add('active');
            // Show first char
            showStroke(w.chinese[0]);
        };

        // Navigation
        $('#vocab-prev').onclick = () => {
            if (currentVocabIdx > 0) {
                currentVocabIdx--;
                showVocabCard();
            }
        };

        $('#vocab-next').onclick = () => {
            if (currentVocabIdx < vocabOrder.length - 1) {
                currentVocabIdx++;
                showVocabCard();
            }
        };

        // Shuffle
        $('#vocab-shuffle').onclick = () => {
            for (let i = vocabOrder.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [vocabOrder[i], vocabOrder[j]] = [vocabOrder[j], vocabOrder[i]];
            }
            currentVocabIdx = 0;
            showVocabCard();
        };

        // Auto play
        $('#vocab-auto').onclick = () => {
            if (autoPlayTimer) {
                clearInterval(autoPlayTimer);
                autoPlayTimer = null;
                $('#vocab-auto').classList.remove('active');
                return;
            }
            $('#vocab-auto').classList.add('active');
            autoPlayTimer = setInterval(() => {
                const w = WORD_LESSONS[currentLesson].words[vocabOrder[currentVocabIdx]];
                speak(w.chinese);
                if (currentVocabIdx < vocabOrder.length - 1) {
                    currentVocabIdx++;
                } else {
                    currentVocabIdx = 0;
                }
                showVocabCard();
            }, 3000);
        };

        // Toggle list
        $('#show-vocab-list').onclick = () => {
            const list = $('#vocab-list');
            list.classList.toggle('hidden');
            $('#show-vocab-list').textContent = list.classList.contains('hidden')
                ? '📋 전체 목록 보기' : '📋 목록 닫기';
        };

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.key === 'ArrowLeft') $('#vocab-prev').click();
            if (e.key === 'ArrowRight') $('#vocab-next').click();
            if (e.key === ' ') { e.preventDefault(); $('#vocab-card').click(); }
        });
    }

    function buildVocabTable(vocab) {
        const tbody = $('#vocab-table tbody');
        tbody.innerHTML = '';
        vocab.forEach(w => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${w.chinese}</td>
                <td>${w.pinyin}</td>
                <td>${w.korean}</td>
                <td>${w.english}</td>
                <td>${getPosLabel(w.pos)}</td>
                <td><button class="table-speak-btn" onclick="event.stopPropagation()">🔊</button></td>
            `;
            tr.querySelector('.table-speak-btn').onclick = () => speak(w.chinese);
            tbody.appendChild(tr);
        });
    }

    // ===== Stroke Order =====
    function setupStrokePanel() {
        $('#stroke-animate').onclick = () => {
            const ch = $('#stroke-input').value.trim();
            if (ch) showStroke(ch, 'animate');
        };

        $('#stroke-quiz').onclick = () => {
            const ch = $('#stroke-input').value.trim();
            if (ch) showStroke(ch, 'quiz');
        };
    }

    function loadStrokeGrid(lesson) {
        const grid = $('#stroke-char-grid');
        grid.innerHTML = '';
        const chars = new Set();
        lesson.words.forEach(w => {
            for (const c of w.chinese) {
                if (/[\u4e00-\u9fff]/.test(c)) chars.add(c);
            }
        });
        chars.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'stroke-char-btn';
            btn.textContent = ch;
            btn.onclick = () => {
                $('#stroke-input').value = ch;
                showStroke(ch);
            };
            grid.appendChild(btn);
        });
    }

    function showStroke(char, mode = 'animate') {
        const target = $('#hanzi-target');
        target.innerHTML = '';
        $('#stroke-info').textContent = '';

        $$('.stroke-char-btn').forEach(b => b.classList.toggle('active', b.textContent === char));
        $('#stroke-input').value = char;

        try {
            if (mode === 'quiz') {
                hanziWriter = HanziWriter.create(target, char, {
                    width: 200,
                    height: 200,
                    padding: 10,
                    showOutline: true,
                    showCharacter: false,
                    strokeColor: '#8b5cf6',
                    outlineColor: 'rgba(255,255,255,0.1)',
                    drawingColor: '#06b6d4',
                    highlightColor: '#f43f5e',
                    radicalColor: '#10b981',
                    drawingWidth: 4,
                    showHintAfterMisses: 2
                });
                hanziWriter.quiz({
                    onComplete: (summary) => {
                        const info = `✅ 완성! 오류: ${summary.totalMistakes}회`;
                        $('#stroke-info').textContent = info;
                    }
                });
                $('#stroke-info').textContent = '✏️ 직접 써보세요!';
            } else {
                hanziWriter = HanziWriter.create(target, char, {
                    width: 200,
                    height: 200,
                    padding: 10,
                    strokeAnimationSpeed: 1,
                    delayBetweenStrokes: 300,
                    strokeColor: '#8b5cf6',
                    outlineColor: 'rgba(255,255,255,0.15)',
                    radicalColor: '#10b981'
                });
                hanziWriter.animateCharacter();
                $('#stroke-info').textContent = `${char} — 획순 애니메이션`;
            }
        } catch (e) {
            $('#stroke-info').textContent = '⚠ 해당 한자의 필획 데이터를 찾을 수 없습니다.';
        }
    }

    // ===== Quiz: Pinyin → Chinese + Korean =====
    function setupQuizPinyin() {
        $('#quiz-p-submit').onclick = () => checkQuizPinyin();
        $('#quiz-p-skip').onclick = () => skipQuizPinyin();
        $('#quiz-p-reset').onclick = () => resetQuizPinyin(WORD_LESSONS[currentLesson]);

        // Enter to submit
        $('#quiz-p-chinese').onkeydown = (e) => { if (e.key === 'Enter') $('#quiz-p-submit').click(); };
        $('#quiz-p-korean').onkeydown = (e) => { if (e.key === 'Enter') $('#quiz-p-submit').click(); };
    }

    function resetQuizPinyin(lesson) {
        const words = lesson.words;
        quizPOrder = words.map((_, i) => i);
        // Shuffle
        for (let i = quizPOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [quizPOrder[i], quizPOrder[j]] = [quizPOrder[j], quizPOrder[i]];
        }
        quizPIdx = 0;
        quizPCorrect = 0;
        quizPTotal = 0;
        updateQuizPScore();
        showQuizPinyin();
    }

    function showQuizPinyin() {
        const lesson = WORD_LESSONS[currentLesson];
        if (quizPIdx >= quizPOrder.length) {
            $('#quiz-p-container .quiz-prompt').innerHTML = `
                <div class="quiz-label">퀴즈 완료!</div>
                <div class="quiz-question" style="font-size:24px; color: var(--accent4);">
                    🎉 ${quizPCorrect} / ${quizPTotal} 정답
                </div>`;
            return;
        }
        const w = lesson.words[quizPOrder[quizPIdx]];
        $('#quiz-p-pinyin').textContent = w.pinyin;
        $('#quiz-p-chinese').value = '';
        $('#quiz-p-korean').value = '';
        $('#quiz-p-chinese').className = '';
        $('#quiz-p-korean').className = '';
        $('#quiz-p-feedback').innerHTML = '';
        $('#quiz-p-feedback').className = 'quiz-feedback';
        $('#quiz-p-chinese').focus();
    }

    function checkQuizPinyin() {
        const lesson = WORD_LESSONS[currentLesson];
        if (quizPIdx >= quizPOrder.length) return;
        const w = lesson.words[quizPOrder[quizPIdx]];
        const inputCh = $('#quiz-p-chinese').value.trim();
        const inputKr = $('#quiz-p-korean').value.trim();

        const chCorrect = inputCh === w.chinese;
        const krCorrect = w.korean.split(',').some(k => inputKr.includes(k.trim())) || inputKr === w.korean;

        $('#quiz-p-chinese').className = chCorrect ? 'correct' : 'wrong';
        $('#quiz-p-korean').className = krCorrect ? 'correct' : 'wrong';

        const allCorrect = chCorrect && krCorrect;
        quizPTotal++;
        if (allCorrect) quizPCorrect++;
        updateQuizPScore();

        const fb = $('#quiz-p-feedback');
        fb.className = 'quiz-feedback ' + (allCorrect ? 'correct-fb' : 'wrong-fb');
        fb.innerHTML = `
            <div class="feedback-icon">${allCorrect ? '✅' : '❌'}</div>
            <div class="feedback-answer">${w.chinese} — ${w.pinyin}</div>
            <div class="feedback-detail">
                ${w.korean} | ${w.english}
                ${!chCorrect ? '<br>간체자: <b>' + w.chinese + '</b>' : ''}
                ${!krCorrect ? '<br>한국어: <b>' + w.korean + '</b>' : ''}
            </div>`;

        setTimeout(() => {
            quizPIdx++;
            showQuizPinyin();
        }, allCorrect ? 1200 : 2500);
    }

    function skipQuizPinyin() {
        const lesson = WORD_LESSONS[currentLesson];
        if (quizPIdx >= quizPOrder.length) return;
        const w = lesson.words[quizPOrder[quizPIdx]];

        const fb = $('#quiz-p-feedback');
        fb.className = 'quiz-feedback wrong-fb';
        fb.innerHTML = `
            <div class="feedback-icon">⏭</div>
            <div class="feedback-answer">${w.chinese} — ${w.pinyin}</div>
            <div class="feedback-detail">${w.korean} | ${w.english}</div>`;

        quizPTotal++;
        updateQuizPScore();
        setTimeout(() => { quizPIdx++; showQuizPinyin(); }, 2000);
    }

    function updateQuizPScore() {
        $('#quiz-p-score').textContent = `점수: ${quizPCorrect} / ${quizPTotal}`;
    }

    // ===== Quiz: Korean → Chinese + Pinyin =====
    function setupQuizKorean() {
        $('#quiz-k-submit').onclick = () => checkQuizKorean();
        $('#quiz-k-skip').onclick = () => skipQuizKorean();
        $('#quiz-k-reset').onclick = () => resetQuizKorean(WORD_LESSONS[currentLesson]);

        $('#quiz-k-chinese').onkeydown = (e) => { if (e.key === 'Enter') $('#quiz-k-submit').click(); };
        $('#quiz-k-pinyin').onkeydown = (e) => { if (e.key === 'Enter') $('#quiz-k-submit').click(); };
    }

    function resetQuizKorean(lesson) {
        const words = lesson.words;
        quizKOrder = words.map((_, i) => i);
        for (let i = quizKOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [quizKOrder[i], quizKOrder[j]] = [quizKOrder[j], quizKOrder[i]];
        }
        quizKIdx = 0;
        quizKCorrect = 0;
        quizKTotal = 0;
        updateQuizKScore();
        showQuizKorean();
    }

    function showQuizKorean() {
        const lesson = WORD_LESSONS[currentLesson];
        if (quizKIdx >= quizKOrder.length) {
            $('#quiz-k-container .quiz-prompt').innerHTML = `
                <div class="quiz-label">퀴즈 완료!</div>
                <div class="quiz-question" style="font-size:24px; color: var(--accent4);">
                    🎉 ${quizKCorrect} / ${quizKTotal} 정답
                </div>`;
            return;
        }
        const w = lesson.words[quizKOrder[quizKIdx]];
        $('#quiz-k-korean').textContent = w.korean;
        $('#quiz-k-chinese').value = '';
        $('#quiz-k-pinyin').value = '';
        $('#quiz-k-chinese').className = '';
        $('#quiz-k-pinyin').className = '';
        $('#quiz-k-feedback').innerHTML = '';
        $('#quiz-k-feedback').className = 'quiz-feedback';
        $('#quiz-k-chinese').focus();
    }

    function checkQuizKorean() {
        const lesson = WORD_LESSONS[currentLesson];
        if (quizKIdx >= quizKOrder.length) return;
        const w = lesson.words[quizKOrder[quizKIdx]];
        const inputCh = $('#quiz-k-chinese').value.trim();
        const inputPy = $('#quiz-k-pinyin').value.trim();

        const chCorrect = inputCh === w.chinese;
        // Flexible pinyin matching: support numbered tones (ni3 hao3) and toned chars (nǐ hǎo)
        const pyCorrect = comparePinyin(inputPy, w.pinyin);

        $('#quiz-k-chinese').className = chCorrect ? 'correct' : 'wrong';
        $('#quiz-k-pinyin').className = pyCorrect ? 'correct' : 'wrong';

        const allCorrect = chCorrect && pyCorrect;
        quizKTotal++;
        if (allCorrect) quizKCorrect++;
        updateQuizKScore();

        const fb = $('#quiz-k-feedback');
        fb.className = 'quiz-feedback ' + (allCorrect ? 'correct-fb' : 'wrong-fb');
        fb.innerHTML = `
            <div class="feedback-icon">${allCorrect ? '✅' : '❌'}</div>
            <div class="feedback-answer">${w.chinese} — ${w.pinyin}</div>
            <div class="feedback-detail">
                ${w.korean} | ${w.english}
                ${!chCorrect ? '<br>간체자: <b>' + w.chinese + '</b>' : ''}
                ${!pyCorrect ? '<br>병음: <b>' + w.pinyin + '</b>' : ''}
            </div>`;

        setTimeout(() => {
            quizKIdx++;
            showQuizKorean();
        }, allCorrect ? 1200 : 2500);
    }

    // ===== Pinyin comparison with numbered tone support =====
    // Converts numbered pinyin (ni3 hao3) to toned pinyin (nǐ hǎo)
    function numberedToToned(str) {
        const toneMarks = {
            'a': ['ā', 'á', 'ǎ', 'à'], 'e': ['ē', 'é', 'ě', 'è'],
            'i': ['ī', 'í', 'ǐ', 'ì'], 'o': ['ō', 'ó', 'ǒ', 'ò'],
            'u': ['ū', 'ú', 'ǔ', 'ù'], 'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
            'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
        };

        // Split into syllables (word + optional tone number)
        const syllables = str.toLowerCase().split(/\s+/);
        return syllables.map(syl => {
            const match = syl.match(/^([a-züv]+)([1-4])?$/);
            if (!match) return syl;
            let [, letters, tone] = match;
            if (!tone || tone === '5') return letters; // neutral tone

            const toneIdx = parseInt(tone) - 1;
            // Find the vowel to apply tone to (rule: a/e always get it, ou→o, otherwise last vowel)
            if (letters.includes('a')) {
                return letters.replace('a', toneMarks['a'][toneIdx]);
            } else if (letters.includes('e')) {
                return letters.replace('e', toneMarks['e'][toneIdx]);
            } else if (letters.includes('ou')) {
                return letters.replace('o', toneMarks['o'][toneIdx]);
            } else {
                // Apply to last vowel
                const vowels = 'iouüv';
                for (let j = letters.length - 1; j >= 0; j--) {
                    const ch = letters[j];
                    if (vowels.includes(ch)) {
                        const mark = toneMarks[ch] ? toneMarks[ch][toneIdx] : ch;
                        return letters.substring(0, j) + mark + letters.substring(j + 1);
                    }
                }
            }
            return letters;
        }).join(' ');
    }

    function comparePinyin(input, expected) {
        if (!input) return false;
        // Strip whitespace and apostrophes for comparison
        const norm = (s) => s.toLowerCase().replace(/[\s']/g, '');
        const stripTones = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Direct match (with tone marks)
        if (norm(input) === norm(expected)) return true;

        // Numbered tone input → convert to toned, then compare
        if (/[1-4]/.test(input)) {
            const converted = numberedToToned(input);
            if (norm(converted) === norm(expected)) return true;
        }

        // Toneless match (strip all tone marks)
        if (stripTones(norm(input)) === stripTones(norm(expected))) return true;

        return false;
    }


    function skipQuizKorean() {
        const lesson = WORD_LESSONS[currentLesson];
        if (quizKIdx >= quizKOrder.length) return;
        const w = lesson.words[quizKOrder[quizKIdx]];

        const fb = $('#quiz-k-feedback');
        fb.className = 'quiz-feedback wrong-fb';
        fb.innerHTML = `
            <div class="feedback-icon">⏭</div>
            <div class="feedback-answer">${w.chinese} — ${w.pinyin}</div>
            <div class="feedback-detail">${w.korean} | ${w.english}</div>`;

        quizKTotal++;
        updateQuizKScore();
        setTimeout(() => { quizKIdx++; showQuizKorean(); }, 2000);
    }

    function updateQuizKScore() {
        $('#quiz-k-score').textContent = `점수: ${quizKCorrect} / ${quizKTotal}`;
    }

    // ===== Pronunciation Practice =====
    function setupPronunciation() {
        $('#pron-listen').onclick = () => {
            const w = getCurrentPronWord();
            if (w) speak(w.chinese);
        };

        $('#pron-repeat').onclick = () => {
            const w = getCurrentPronWord();
            if (w) speak(w.chinese);
        };

        $('#pron-record').onclick = () => startRecording();
        $('#pron-retry').onclick = () => startRecording();

        $('#pron-prev').onclick = () => {
            if (pronIdx > 0) { pronIdx--; showPronCard(); }
        };

        $('#pron-next').onclick = () => {
            if (pronIdx < pronOrder.length - 1) { pronIdx++; showPronCard(); }
        };

        $('#pron-shuffle').onclick = () => {
            for (let i = pronOrder.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pronOrder[i], pronOrder[j]] = [pronOrder[j], pronOrder[i]];
            }
            pronIdx = 0;
            showPronCard();
        };
    }

    function loadPronunciation(lesson) {
        pronOrder = lesson.words.map((_, i) => i);
        pronIdx = 0;
        showPronCard();
    }

    function getCurrentPronWord() {
        const lesson = WORD_LESSONS[currentLesson];
        return lesson.words[pronOrder[pronIdx]];
    }

    function showPronCard() {
        const w = getCurrentPronWord();
        if (!w) return;
        $('.pron-chinese').textContent = w.chinese;
        $('.pron-pinyin').textContent = w.pinyin;
        $('.pron-meaning').textContent = `${w.korean} | ${w.english}`;
        $('#pron-counter').textContent = `${pronIdx + 1} / ${pronOrder.length}`;
        // Hide feedback
        const fb = $('#pron-feedback');
        fb.classList.add('hidden');
        fb.classList.remove('acceptable', 'needs-fix');
    }

    function startRecording() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('이 브라우저는 음성 인식을 지원하지 않습니다.\nChrome 또는 Edge를 사용해 주세요.');
            return;
        }

        const recordBtn = $('#pron-record');
        const retryBtn = $('#pron-retry');

        // If already recording, stop
        if (recognition) {
            recognition.stop();
            recognition = null;
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '🎤 따라 읽기 (Speak)';
            retryBtn.innerHTML = '🔄 다시 녹음';
            return;
        }

        // Clear previous feedback
        const fb = $('#pron-feedback');
        fb.classList.add('hidden');
        fb.classList.remove('acceptable', 'needs-fix');

        recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 3;

        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '⏹ 녹음 중... (Stop)';
        retryBtn.innerHTML = '⏹ 녹음 중...';

        recognition.onresult = (e) => {
            const results = [];
            for (let i = 0; i < e.results[0].length; i++) {
                results.push({
                    text: e.results[0][i].transcript,
                    confidence: e.results[0][i].confidence
                });
            }
            evaluatePronunciation(results);
        };

        recognition.onerror = (e) => {
            console.error('Speech recognition error:', e.error);
            showPronFeedback('error', '음성 인식 오류', `오류: ${e.error}. 다시 시도해 주세요.`);
        };

        recognition.onend = () => {
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '🎤 따라 읽기 (Speak)';
            retryBtn.innerHTML = '🔄 다시 녹음';
            recognition = null;
        };

        recognition.start();
    }

    function evaluatePronunciation(results) {
        const w = getCurrentPronWord();
        if (!w || results.length === 0) return;

        const fb = $('#pron-feedback');
        fb.classList.remove('hidden', 'acceptable', 'needs-fix');

        const normalizeStr = (s) => s.replace(/[\s，。！？、]/g, '').toLowerCase();
        const expected = normalizeStr(w.chinese);

        // Analyze ALL alternatives for better evaluation
        const bestResult = results[0];
        const recognized = bestResult.text;
        const confidence = bestResult.confidence;
        const got = normalizeStr(recognized);

        const isMatch = expected === got;
        const isPartialMatch = got.includes(expected) || expected.includes(got);

        // Check how many alternatives match the expected text
        let matchingAlts = 0;
        let altTexts = [];
        results.forEach(r => {
            const t = normalizeStr(r.text);
            altTexts.push(`${r.text}(${Math.round(r.confidence * 100)}%)`);
            if (t === expected) matchingAlts++;
        });

        // Build a pronunciation score:
        // - Base: confidence from best result
        // - Penalty: if alternatives disagree, deduct points
        // - Penalty: if not all alternatives match, deduct points
        const altAgreement = results.length > 1 ? matchingAlts / results.length : 1;
        const score = (confidence * 0.6 + altAgreement * 0.4);

        const confidencePercent = Math.round(confidence * 100);
        const scorePercent = Math.round(score * 100);

        // Show alternatives for transparency
        const altDisplay = altTexts.length > 1
            ? `<br><span style="font-size:11px;color:var(--text-muted)">후보: ${altTexts.join(' / ')}</span>`
            : '';

        if (isMatch && score >= 0.85) {
            // Confident good pronunciation
            fb.classList.add('acceptable');
            $('#pron-result-icon').textContent = '✅';
            $('#pron-result-text').textContent = 'Acceptable! 잘했어요!';
            $('#pron-result-text').style.color = 'var(--accent4)';
            $('#pron-result-detail').innerHTML = `
                인식된 발음: <span class="recognized">${recognized}</span>
                정확도: ${confidencePercent}% | 종합: ${scorePercent}점<br>
                발음이 정확합니다. 👏${altDisplay}
            `;
        } else if (isMatch && score >= 0.65) {
            // Match but low confidence — borderline
            fb.classList.add('needs-fix');
            $('#pron-result-icon').textContent = '🔄';
            $('#pron-result-text').textContent = 'Almost! 조금 더 정확하게!';
            $('#pron-result-text').style.color = '#fbbf24';
            $('#pron-result-detail').innerHTML = `
                인식된 발음: <span class="recognized">${recognized}</span>
                정확도: ${confidencePercent}% | 종합: ${scorePercent}점<br>
                발음이 불확실합니다. 더 또렷하게 발음해 보세요.<br>
                <b>수정 방법:</b><br>
                ${getPronunciationTip(w, recognized)}${altDisplay}
            `;
        } else if (isPartialMatch) {
            // Partial match
            fb.classList.add('needs-fix');
            $('#pron-result-icon').textContent = '🔄';
            $('#pron-result-text').textContent = 'Almost! 거의 맞았어요!';
            $('#pron-result-text').style.color = '#fbbf24';
            $('#pron-result-detail').innerHTML = `
                인식된 발음: <span class="recognized">${recognized}</span>
                기대한 발음: <span class="recognized">${w.chinese}</span>
                정확도: ${confidencePercent}% | 종합: ${scorePercent}점<br>
                <b>수정 방법:</b><br>
                ${getPronunciationTip(w, recognized)}${altDisplay}
            `;
        } else {
            // Wrong
            fb.classList.add('needs-fix');
            $('#pron-result-icon').textContent = '❌';
            $('#pron-result-text').textContent = 'Need to fix! 다시 연습해 보세요.';
            $('#pron-result-text').style.color = 'var(--accent)';
            $('#pron-result-detail').innerHTML = `
                인식된 발음: <span class="recognized">${recognized || '(인식 안 됨)'}</span>
                기대한 발음: <span class="recognized">${w.chinese}</span>
                정확도: ${confidencePercent}% | 종합: ${scorePercent}점<br>
                <b>수정 방법:</b><br>
                ${getPronunciationTip(w, recognized)}<br>
                🔊 버튼을 눌러 정확한 발음을 다시 들어보세요.${altDisplay}
            `;
        }
    }

    function getPronunciationTip(word, recognized) {
        const tips = [];
        const pinyin = word.pinyin;

        // Detect tone marks and provide tone guidance
        const toneMap = {
            'ā': '1성 (평평하게)', 'á': '2성 (올라가듯)',
            'ǎ': '3성 (내려갔다 올라가듯)', 'à': '4성 (확 내려가듯)',
            'ē': '1성', 'é': '2성', 'ě': '3성', 'è': '4성',
            'ī': '1성', 'í': '2성', 'ǐ': '3성', 'ì': '4성',
            'ō': '1성', 'ó': '2성', 'ǒ': '3성', 'ò': '4성',
            'ū': '1성', 'ú': '2성', 'ǔ': '3성', 'ù': '4성',
            'ǖ': '1성', 'ǘ': '2성', 'ǚ': '3성', 'ǜ': '4성'
        };

        const tones = [];
        for (const ch of pinyin) {
            if (toneMap[ch]) {
                tones.push(`"${ch}" → ${toneMap[ch]}`);
            }
        }

        if (tones.length > 0) {
            tips.push(`성조에 주의하세요: ${tones.join(', ')}`);
        }

        // Check for common difficult sounds
        if (pinyin.includes('zh') || pinyin.includes('ch') || pinyin.includes('sh')) {
            tips.push('zh/ch/sh: 혀를 살짝 말아올려서 발음하세요 (권설음)');
        }
        if (pinyin.includes('z') && !pinyin.includes('zh')) {
            tips.push('z: "ㅉ"에 가까운 소리로 발음하세요');
        }
        if (pinyin.includes('c') && !pinyin.includes('ch')) {
            tips.push('c: "ㅊ"에 가까운 소리로 발음하세요');
        }
        if (pinyin.includes('s') && !pinyin.includes('sh')) {
            tips.push('s: "ㅆ"에 가까운 소리로 발음하세요');
        }
        if (pinyin.includes('r')) {
            tips.push('r: 혀를 말면서 "ㄹ" 소리를 내세요');
        }
        if (pinyin.includes('ü') || pinyin.includes('ǖ') || pinyin.includes('ǘ') || pinyin.includes('ǚ') || pinyin.includes('ǜ')) {
            tips.push('ü: "위"처럼 입을 둥글게 모아 발음하세요');
        }

        if (tips.length === 0) {
            tips.push(`"${pinyin}"을(를) 천천히 따라 읽어보세요.`);
        }

        return tips.join('<br>');
    }

    function showPronFeedback(type, title, detail) {
        const fb = $('#pron-feedback');
        fb.classList.remove('hidden', 'acceptable', 'needs-fix');
        fb.classList.add(type === 'error' ? 'needs-fix' : 'acceptable');
        $('#pron-result-icon').textContent = type === 'error' ? '⚠️' : '✅';
        $('#pron-result-text').textContent = title;
        $('#pron-result-text').style.color = type === 'error' ? 'var(--accent)' : 'var(--accent4)';
        $('#pron-result-detail').innerHTML = detail;
    }

    // ===== Pinyin IME + Handwriting Canvas =====
    let hwTargetInput = null; // which input the handwriting modal will fill
    let hwStrokes = [];       // array of strokes for current drawing
    let hwCurrentStroke = []; // current in-progress stroke
    let hwDrawing = false;

    function setupInputHelpers() {
        // Pinyin IME: attach to both quiz Chinese inputs
        setupIME('quiz-p-chinese', 'quiz-p-chinese-ime');
        setupIME('quiz-k-chinese', 'quiz-k-chinese-ime');

        // Handwriting: attach to all draw helper buttons
        $$('.helper-btn[data-helper="draw"]').forEach(btn => {
            btn.onclick = () => {
                hwTargetInput = btn.dataset.target;
                openHandwritingModal();
            };
        });

        // Handwriting modal controls
        $('#hw-close').onclick = closeHandwritingModal;
        $('#hw-clear').onclick = clearCanvas;
        $('#hw-undo').onclick = undoStroke;

        // Canvas drawing
        const canvas = $('#hw-canvas');
        canvas.addEventListener('pointerdown', hwPointerDown);
        canvas.addEventListener('pointermove', hwPointerMove);
        canvas.addEventListener('pointerup', hwPointerUp);
        canvas.addEventListener('pointerleave', hwPointerUp);

        // Close modal on backdrop click
        $('#handwriting-modal').onclick = (e) => {
            if (e.target === $('#handwriting-modal')) closeHandwritingModal();
        };

        setupInputHelpers_HW();
    }

    // --- Pinyin IME ---
    function setupIME(inputId, dropdownId) {
        const input = $('#' + inputId);
        const dropdown = $('#' + dropdownId);
        if (!input || !dropdown) return;

        input.addEventListener('input', () => {
            const val = input.value.trim().toLowerCase();
            if (!val || /[\u4e00-\u9fff]/.test(val)) {
                dropdown.classList.add('hidden');
                return;
            }
            // Match lesson words whose pinyin starts with the typed text
            const lesson = WORD_LESSONS[currentLesson];
            const stripTones = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const matches = lesson.words.filter(w => {
                const py = stripTones(w.pinyin).replace(/[\s']/g, '');
                const pyWords = stripTones(w.pinyin).split(/\s+/);
                return py.startsWith(val) || pyWords.some(p => p.startsWith(val));
            });

            if (matches.length === 0) {
                dropdown.innerHTML = '<div class="ime-hint">후보 없음</div>';
                dropdown.classList.remove('hidden');
                return;
            }

            dropdown.innerHTML = '';
            // Deduplicate by chinese character
            const seen = new Set();
            matches.forEach(w => {
                if (seen.has(w.chinese)) return;
                seen.add(w.chinese);
                const btn = document.createElement('button');
                btn.className = 'ime-candidate';
                btn.innerHTML = `${w.chinese}<span class="ime-pinyin">${w.pinyin}</span>`;
                btn.onclick = (e) => {
                    e.preventDefault();
                    input.value = w.chinese;
                    dropdown.classList.add('hidden');
                    // Focus next input
                    const nextInput = input.closest('.quiz-field').nextElementSibling;
                    if (nextInput) {
                        const nextField = nextInput.querySelector('input');
                        if (nextField) nextField.focus();
                    }
                };
                dropdown.appendChild(btn);
            });
            dropdown.classList.remove('hidden');
        });

        // Hide dropdown when input loses focus (with delay for click)
        input.addEventListener('blur', () => {
            setTimeout(() => dropdown.classList.add('hidden'), 200);
        });
    }

    // --- Handwriting Canvas with Recognition ---
    let hwRecognizeTimer = null;
    let hwRecognizedText = ''; // accumulated recognized chars

    function setupInputHelpers_HW() {
        $('#hw-confirm').onclick = confirmHandwriting;
    }

    function openHandwritingModal() {
        $('#handwriting-modal').classList.remove('hidden');
        hwRecognizedText = '';
        $('#hw-recognized-preview').textContent = '';
        clearCanvas();
    }

    function closeHandwritingModal() {
        $('#handwriting-modal').classList.add('hidden');
    }

    function confirmHandwriting() {
        if (hwTargetInput && hwRecognizedText) {
            const input = $('#' + hwTargetInput);
            input.value = hwRecognizedText;
        }
        closeHandwritingModal();
    }

    function clearCanvas() {
        const canvas = $('#hw-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCanvasGrid(ctx, canvas.width, canvas.height);
        hwStrokes = [];
        hwCurrentStroke = [];
        clearTimeout(hwRecognizeTimer);
        $('#hw-candidates').innerHTML = '<div class="ime-hint">위에 한자를 써보세요</div>';
    }

    function undoStroke() {
        if (hwStrokes.length === 0) return;
        hwStrokes.pop();
        redrawCanvas();
        if (hwStrokes.length > 0) {
            recognizeHandwriting();
        } else {
            $('#hw-candidates').innerHTML = '<div class="ime-hint">위에 한자를 써보세요</div>';
        }
    }

    function drawCanvasGrid(ctx, w, h) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.moveTo(0, 0); ctx.lineTo(w, h);
        ctx.moveTo(w, 0); ctx.lineTo(0, h);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function redrawCanvas() {
        const canvas = $('#hw-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCanvasGrid(ctx, canvas.width, canvas.height);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        hwStrokes.forEach(stroke => {
            if (stroke.pts.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(stroke.pts[0].x, stroke.pts[0].y);
            for (let i = 1; i < stroke.pts.length; i++) {
                ctx.lineTo(stroke.pts[i].x, stroke.pts[i].y);
            }
            ctx.stroke();
        });
    }

    function getCanvasPos(e) {
        const canvas = $('#hw-canvas');
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    let hwStrokeStartTime = 0;

    function hwPointerDown(e) {
        e.preventDefault();
        hwDrawing = true;
        hwStrokeStartTime = Date.now();
        const pos = getCanvasPos(e);
        hwCurrentStroke = [{ ...pos, t: 0 }];
        const canvas = $('#hw-canvas');
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function hwPointerMove(e) {
        if (!hwDrawing) return;
        e.preventDefault();
        const pos = getCanvasPos(e);
        pos.t = Date.now() - hwStrokeStartTime;
        hwCurrentStroke.push(pos);
        const canvas = $('#hw-canvas');
        const ctx = canvas.getContext('2d');
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function hwPointerUp(e) {
        if (!hwDrawing) return;
        hwDrawing = false;
        if (hwCurrentStroke.length > 1) {
            hwStrokes.push({ pts: [...hwCurrentStroke] });
            // Auto-recognize after a short delay
            clearTimeout(hwRecognizeTimer);
            hwRecognizeTimer = setTimeout(recognizeHandwriting, 400);
        }
        hwCurrentStroke = [];
    }

    // Google Handwriting Recognition API
    async function recognizeHandwriting() {
        if (hwStrokes.length === 0) return;

        // Build ink data in Google's format: [[x1,x2,...], [y1,y2,...], [t1,t2,...]]
        const ink = hwStrokes.map(stroke => {
            const xs = stroke.pts.map(p => Math.round(p.x));
            const ys = stroke.pts.map(p => Math.round(p.y));
            const ts = stroke.pts.map(p => p.t);
            return [xs, ys, ts];
        });

        const payload = {
            app_version: 0.3,
            api_level: '537.36',
            device: navigator.userAgent.substring(0, 50),
            input_type: 0,
            options: 'enable_pre_space',
            requests: [{
                writing_guide: {
                    writing_area_width: 280,
                    writing_area_height: 280
                },
                ink: ink,
                pre_context: hwRecognizedText,
                max_num_results: 10,
                max_completions: 0,
                language: 'zh'
            }]
        };

        try {
            const resp = await fetch(
                'https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=demopage',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );
            const data = await resp.json();

            if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
                showRecognitionResults(data[1][0][1]);
            } else {
                showRecognitionResults([]);
            }
        } catch (err) {
            console.error('Handwriting recognition error:', err);
            // Fallback: show lesson characters
            showFallbackCandidates();
        }
    }

    function showRecognitionResults(candidates) {
        const container = $('#hw-candidates');
        container.innerHTML = '';

        if (!candidates || candidates.length === 0) {
            container.innerHTML = '<div class="ime-hint">인식 결과 없음 — 다시 써보세요</div>';
            return;
        }

        candidates.forEach((char, idx) => {
            const btn = document.createElement('button');
            btn.className = 'hw-candidate-btn';
            btn.textContent = char;
            btn.onclick = () => selectHWCandidate(char);
            container.appendChild(btn);
        });
    }

    function showFallbackCandidates() {
        // Offline fallback: show lesson characters
        const container = $('#hw-candidates');
        container.innerHTML = '<div class="ime-hint">오프라인 — 아래에서 선택하세요</div>';
        const lesson = WORD_LESSONS[currentLesson];
        const seen = new Set();
        lesson.words.forEach(w => {
            for (const ch of w.chinese) {
                if (/[\u4e00-\u9fff]/.test(ch) && !seen.has(ch)) {
                    seen.add(ch);
                    const btn = document.createElement('button');
                    btn.className = 'hw-candidate-btn';
                    btn.textContent = ch;
                    btn.onclick = () => selectHWCandidate(ch);
                    container.appendChild(btn);
                }
            }
        });
    }

    function selectHWCandidate(char) {
        hwRecognizedText += char;
        $('#hw-recognized-preview').textContent = hwRecognizedText;

        // Clear canvas for next character
        const canvas = $('#hw-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCanvasGrid(ctx, canvas.width, canvas.height);
        hwStrokes = [];
        hwCurrentStroke = [];
        $('#hw-candidates').innerHTML = '<div class="ime-hint">다음 글자를 쓰거나 ✅ 완료</div>';

        // Also update the target input live
        if (hwTargetInput) {
            $('#' + hwTargetInput).value = hwRecognizedText;
        }
    }

    // ===== Progress =====
    function updateProgress() {
        const total = WORD_LESSONS[currentLesson].words.length;
        const pct = ((currentVocabIdx + 1) / total) * 100;
        $('#progress-fill').style.width = pct + '%';
    }

    // ===== Start =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

