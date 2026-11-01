
// =======================
// 画面の取得
// =======================

const participantScreen = document.getElementById("participantScreen");
const participantIdInput = document.getElementById("participantId");
const participantNextButton = document.getElementById("participantNextButton");

const startButton = document.getElementById("startButton");
const startScreen = document.getElementById("startScreen");

const questionScreen = document.getElementById("questionScreen");
const stimulus = document.getElementById("stimulus");

const yesButton = document.getElementById("yesButton");
const noButton = document.getElementById("noButton");

const waitScreen = document.getElementById("waitScreen");
const waitLabel = document.getElementById("waitLabel");

const finishScreen = document.getElementById("finishScreen");
const downloadButton = document.getElementById("downloadButton");


// =======================
// 参加者情報
// =======================

let participantId = "";


// =======================
// 現在の問題
// =======================

let currentStimulus = "";
let currentAnswer = false;
let startTime = 0;
let questionActive = false;


// =======================
// 実験結果
// =======================

let results = [];

const STORAGE_KEY = "calculationExperimentAutosave_v3";

let waitDeadline = null;
let currentScreenName = "participant";


// =======================
// 実験条件
// =======================

const modes = [
    "none",
    "elapsed",
    "remaining"
];

const waitTimes = [
    0,
    5,
    15,
    25,
    35
];

const blockSize = 4;

let conditions = [];
let conditionIndex = 0;
let questionIndex = 0;

let basePhase = true;

let blockQuestions = [];
let baseQuestions = [];
let conditionQuestionSets = [];

let currentSetNumber = null;

let waitTimeout = null;
let waitInterval = null;


// =======================
// 画面表示
// =======================

function showScreen(screen) {

    if (screen === participantScreen) {
        currentScreenName = "participant";
    } else if (screen === startScreen) {
        currentScreenName = "start";
    } else if (screen === questionScreen) {
        currentScreenName = "question";
    } else if (screen === waitScreen) {
        currentScreenName = "wait";
    } else if (screen === finishScreen) {
        currentScreenName = "finish";
    }

    const screens = [
        participantScreen,
        startScreen,
        questionScreen,
        waitScreen,
        finishScreen
    ];

    screens.forEach(element => {
        if (element) {
            element.style.display = "none";
        }
    });

    screen.style.display = "block";

}


// =======================
// 自動保存
// =======================

function saveProgress() {

    try {

        const state = {

            participantId,
            results,
            conditions,
            conditionIndex,
            questionIndex,
            basePhase,

            blockQuestions,
            baseQuestions,
            conditionQuestionSets,

            currentSetNumber,

            currentStimulus,
            currentAnswer,
            questionActive,

            currentScreenName,
            waitDeadline,

            savedAt: new Date().toISOString()

        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        console.error(
            "実験データの自動保存に失敗しました。",
            error
        );

        alert(
            "実験データの自動保存に失敗しました。" +
            "CSVを保存してください。"
        );

    }

}


// =======================
// 保存データの取得
// =======================

function getSavedProgress() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        return saved ? JSON.parse(saved) : null;

    } catch (error) {

        console.error(
            "保存データを読み込めませんでした。",
            error
        );

        return null;

    }

}


// =======================
// 保存データの削除
// =======================

function clearSavedProgress() {

    try {

        localStorage.removeItem(STORAGE_KEY);

    } catch (error) {

        console.error(
            "保存データを削除できませんでした。",
            error
        );

    }

}


// =======================
// タイマー解除
// =======================

function stopWaitTimer() {

    if (waitTimeout !== null) {

        clearTimeout(waitTimeout);
        waitTimeout = null;

    }

    if (waitInterval !== null) {

        clearInterval(waitInterval);
        waitInterval = null;

    }

}


// =======================
// 途中再開
// =======================

function restoreProgress(state) {

    participantId = state.participantId || "";

    results = Array.isArray(state.results)
        ? state.results
        : [];

    conditions = Array.isArray(state.conditions)
        ? state.conditions
        : [];

    conditionIndex =
        Number.isInteger(state.conditionIndex)
            ? state.conditionIndex
            : 0;

    questionIndex =
        Number.isInteger(state.questionIndex)
            ? state.questionIndex
            : 0;

    basePhase = state.basePhase !== false;

    blockQuestions = Array.isArray(state.blockQuestions)
        ? state.blockQuestions
        : [];

    baseQuestions = Array.isArray(state.baseQuestions)
        ? state.baseQuestions
        : [];

    conditionQuestionSets =
        Array.isArray(state.conditionQuestionSets)
            ? state.conditionQuestionSets
            : [];

    currentSetNumber = state.currentSetNumber ?? null;

    currentStimulus = state.currentStimulus || "";
    currentAnswer = Boolean(state.currentAnswer);

    // 再開時は反応時間を新しく計測する
    questionActive = false;

    waitDeadline = state.waitDeadline || null;

    participantIdInput.value = participantId;


    // 実験終了後
    if (state.currentScreenName === "finish") {

        showScreen(finishScreen);

        downloadButton.style.display = "inline-block";

        return;

    }


    // 待機中
    if (
        state.currentScreenName === "wait" &&
        waitDeadline !== null &&
        conditions[conditionIndex]
    ) {

        const remainingMs = Math.max(
            0,
            waitDeadline - Date.now()
        );

        startWaitScreen(remainingMs);

        return;

    }


    // 問題回答中
    if (
        state.currentScreenName === "question" &&
        blockQuestions.length > 0 &&
        questionIndex < blockQuestions.length
    ) {

        stimulus.textContent = currentStimulus;

        showScreen(questionScreen);

        questionActive = true;

        yesButton.disabled = false;
        noButton.disabled = false;

        startTime = performance.now();

        saveProgress();

        return;

    }


    // 開始画面
    showScreen(startScreen);

    saveProgress();

}


// =======================
// 起動時の保存データ確認
// =======================

function checkForSavedProgress() {

    const saved = getSavedProgress();

    if (
        !saved ||
        !saved.participantId ||
        !Array.isArray(saved.results)
    ) {

        return;

    }

    const shouldResume = confirm(

        "前回の計算課題の保存データがあります。\n" +
        "参加者番号：" + saved.participantId + "\n" +
        "保存済み回答数：" + saved.results.length + "問\n\n" +
        "OK：続きから再開する\n" +
        "キャンセル：保存データを削除して新しく開始する"

    );

    if (shouldResume) {

        restoreProgress(saved);

    } else {

        clearSavedProgress();

        showScreen(participantScreen);

    }

}


// =======================
// 条件生成
// =======================

function generateConditions() {

    conditions = [];

    let id = 1;

    for (const mode of modes) {

        for (const time of waitTimes) {

            conditions.push({

                id: id++,

                mode: mode,

                waitTime: time

            });

        }

    }

    conditions = shuffleArray(conditions);

    console.log("===== 待機条件 =====");

    console.table(conditions);

}


// =======================
// 配列のシャッフル
// =======================

function shuffleArray(array, random = Math.random) {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

        const j = Math.floor(
            random() * (i + 1)
        );

        [
            shuffled[i],
            shuffled[j]
        ] = [
            shuffled[j],
            shuffled[i]
        ];

    }

    return shuffled;

}


// =======================
// 参加者番号から乱数を生成
// =======================

function createSeededRandom(id) {

    let seed = 0;

    const text = String(id);

    for (let i = 0; i < text.length; i++) {

        seed = (
            seed * 31 +
            text.charCodeAt(i)
        ) >>> 0;

    }

    if (seed === 0) {
        seed = 1;
    }

    return function () {

        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;

        return (seed >>> 0) / 4294967296;

    };

}


// =======================
// 問題セットの割り当て
// =======================

// 参加者1：セット1→2→3→...
// 参加者2：セット15→1→2→...
// 参加者3：セット14→15→1→...

function getAssignedSetIndex(conditionArrayIndex) {

    const participantNumber = Number(participantId);

    const offset = (participantNumber - 1) % 15;

    return (
        conditionArrayIndex - offset + 15
    ) % 15;

}


// =======================
// 計算問題の生成
// =======================

function generateQuestions() {

    const random = createSeededRandom(participantId);


    // 問題の種類ごとに分類
    const addCorrect = [];
    const addIncorrect = [];

    const subCorrect = [];
    const subIncorrect = [];


    // 重複防止
    const seen = new Set();


    function addProblem(pool, stimulus, answer) {

        if (seen.has(stimulus)) {
            return;
        }

        seen.add(stimulus);

        pool.push({

            stimulus: stimulus,

            answer: answer

        });

    }


    // =======================
    // 問題生成
    // =======================

    for (let a = 20; a <= 99; a++) {

        for (let b = 20; b <= 99; b++) {


            // 足し算：繰り上がりあり・正解2桁

            if (
                (a % 10) + (b % 10) >= 10 &&
                a + b <= 99
            ) {

                const ans = a + b;

                addProblem(
                    addCorrect,
                    `${a} + ${b} = ${ans}`,
                    true
                );


                // 誤答：正解の±10

                for (const wrong of [ans - 10, ans + 10]) {

                    if (
                        wrong >= 10 &&
                        wrong <= 99
                    ) {

                        addProblem(
                            addIncorrect,
                            `${a} + ${b} = ${wrong}`,
                            false
                        );

                    }

                }

            }


            // 引き算：繰り下がりあり・正解2桁

            if (
                a > b &&
                (a % 10) < (b % 10) &&
                a - b >= 10
            ) {

                const ans = a - b;

                addProblem(
                    subCorrect,
                    `${a} - ${b} = ${ans}`,
                    true
                );


                // 誤答：正解の±10

                for (const wrong of [ans - 10, ans + 10]) {

                    if (
                        wrong >= 10 &&
                        wrong <= 99
                    ) {

                        addProblem(
                            subIncorrect,
                            `${a} - ${b} = ${wrong}`,
                            false
                        );

                    }

                }

            }

        }

    }


    // =======================
    // 4種類の問題
    // =======================

    const pools = [

        {
            name: "足し算・正しい",
            data: addCorrect
        },

        {
            name: "足し算・間違い",
            data: addIncorrect
        },

        {
            name: "引き算・正しい",
            data: subCorrect
        },

        {
            name: "引き算・間違い",
            data: subIncorrect
        }

    ];


    const selectedPools = [];


    // 各種類から16問ずつ選ぶ

    for (const pool of pools) {

        const shuffled = shuffleArray(
            pool.data,
            random
        );

        if (shuffled.length < 16) {

            throw new Error(
                pool.name +
                "の問題が16問未満です：" +
                shuffled.length +
                "問"
            );

        }

        selectedPools.push(
            shuffled.slice(0, 16)
        );

    }


    // =======================
    // 16ブロックを作成
    // =======================

    const blocks = [];

    for (let i = 0; i < 16; i++) {

        const block = [

            selectedPools[0][i],

            selectedPools[1][i],

            selectedPools[2][i],

            selectedPools[3][i]

        ];

        // セット内の順番を固定するため
        // 参加者番号に基づく乱数でシャッフル

        blocks.push(
            shuffleArray(block, random)
        );

    }


    // ブロックの順番も参加者番号に基づいて決定

    const shuffledBlocks = shuffleArray(
        blocks,
        random
    );


    // =======================
    // ベースラインと条件課題に分ける
    // =======================

    baseQuestions = shuffledBlocks[0].map(
        problem => ({ ...problem })
    );

    conditionQuestionSets = shuffledBlocks
        .slice(1)
        .map(block =>
            block.map(problem => ({ ...problem }))
        );


    console.log("===== 問題構成 =====");

    console.log("ベースライン：", baseQuestions);

    console.log(
        "条件課題セット数：",
        conditionQuestionSets.length
    );

    console.log("===== 条件課題の問題セット =====");

    conditionQuestionSets.forEach((set, index) => {

        console.log(
            `セット${index + 1}`,
            set
        );

    });

}


// =======================
// 4問分の問題を準備
// =======================

function generateBlockQuestions(setIndex = null) {

    // ベースライン
    if (setIndex === null) {

        blockQuestions = baseQuestions.map(
            question => ({ ...question })
        );

        currentSetNumber = null;

    }

    // 条件課題
    else {

        blockQuestions =
            conditionQuestionSets[setIndex].map(
                question => ({ ...question })
            );

        currentSetNumber = setIndex + 1;

    }

    questionIndex = 0;

    saveProgress();

}


// =======================
// 問題表示
// =======================

function generateQuestion() {

    if (questionIndex >= blockQuestions.length) {
        return;
    }

    const question = blockQuestions[questionIndex];

    currentStimulus = question.stimulus;

    currentAnswer = question.answer;

    stimulus.textContent = currentStimulus;

    questionActive = true;

    yesButton.disabled = false;
    noButton.disabled = false;

    startTime = performance.now();

    showScreen(questionScreen);

    saveProgress();

}


// =======================
// 待機画面
// =======================

function startWaitScreen(remainingMs = null) {

    questionActive = false;

    yesButton.disabled = true;
    noButton.disabled = true;

    stopWaitTimer();


    // 現在の条件を取得
    const currentCondition = conditions[conditionIndex];

    if (!currentCondition) {
        return;
    }

    const waitTime = currentCondition.waitTime;

    const mode = currentCondition.mode;

    const totalWaitMs = waitTime * 1000;

    const actualRemainingMs =
        remainingMs === null
            ? totalWaitMs
            : Math.max(0, remainingMs);

    waitDeadline = Date.now() + actualRemainingMs;

    showScreen(waitScreen);

    saveProgress();


    // =======================
    // 表示方法なし
    // =======================

    if (mode === "none") {

        waitLabel.textContent = "お待ちください";

    }


    // =======================
    // 残り時間表示
    // =======================

    else if (mode === "remaining") {

        const updateRemaining = () => {

            const remain = Math.max(
                0,
                Math.ceil(
                    (waitDeadline - Date.now()) / 1000
                )
            );

            waitLabel.textContent =
                "残り時間：" + remain + "秒";

        };

        updateRemaining();

        waitInterval = setInterval(
            updateRemaining,
            100
        );

    }


    // =======================
    // 経過時間表示
    // =======================

    else if (mode === "elapsed") {

        const updateElapsed = () => {

            const elapsedSeconds = Math.max(
                0,
                Math.floor(
                    (
                        totalWaitMs -
                        Math.max(
                            0,
                            waitDeadline - Date.now()
                        )
                    ) / 1000
                )
            );

            waitLabel.textContent =
                "経過時間：" +
                Math.min(waitTime, elapsedSeconds) +
                "秒";

        };

        updateElapsed();

        waitInterval = setInterval(
            updateElapsed,
            100
        );

    }


    // =======================
    // 待機終了後
    // =======================

    waitTimeout = setTimeout(() => {

        stopWaitTimer();

        waitDeadline = null;


        // 次の条件に対応する問題セットを取得

        const setIndex =
            getAssignedSetIndex(conditionIndex);

        generateBlockQuestions(setIndex);

        generateQuestion();

        saveProgress();

    }, actualRemainingMs);

}


// =======================
// 回答判定・記録
// =======================

function checkAnswer(userPressedYes) {

    // 二重回答防止
    if (!questionActive) {
        return;
    }

    questionActive = false;

    yesButton.disabled = true;
    noButton.disabled = true;


    // 反応時間
    const reactionTime =
        performance.now() - startTime;


    // 正誤判定
    const correct =
        userPressedYes === currentAnswer;


    const phase =
        basePhase ? "base" : "condition";

    const mode =
        basePhase
            ? "none"
            : conditions[conditionIndex].mode;

    const waitTime =
        basePhase
            ? 0
            : conditions[conditionIndex].waitTime;


    // =======================
    // 結果を記録
    // =======================

    results.push({

        participantId: participantId,

        phase: phase,

        task: "CALCULATION",

        stimulus: currentStimulus,

        response: userPressedYes ? "YES" : "NO",

        correct: correct,

        reactionTime: reactionTime.toFixed(1),

        mode: mode,

        waitTime: waitTime,

        condition:
            basePhase
                ? "base"
                : conditions[conditionIndex].id,

        conditionOrder:
            basePhase
                ? "base"
                : conditionIndex + 1,

        setNumber:
            basePhase
                ? "base"
                : currentSetNumber,

        questionNumber: questionIndex + 1

    });


    console.log(results[results.length - 1]);


    // 次の問題へ
    questionIndex++;


    // 回答直後に保存
    saveProgress();


    // =======================
    // 4問終了後
    // =======================

    if (questionIndex >= blockSize) {


        // ベースライン終了

        if (basePhase) {

            basePhase = false;

            conditionIndex = 0;

            startWaitScreen();

            return;

        }


        // 最後の条件終了

        if (conditionIndex === conditions.length - 1) {

            questionActive = false;

            waitDeadline = null;

            showScreen(finishScreen);

            downloadButton.style.display = "inline-block";

            saveProgress();

            return;

        }


        // 次の条件へ

        conditionIndex++;

        startWaitScreen();

        return;

    }


    // 4問未満なら次の問題

    generateQuestion();

}


// =======================
// CSV保存
// =======================

function downloadCSV() {

    if (results.length === 0) {

        alert("保存する実験結果がありません。");

        return;

    }


    const headers = [

        "participantId",

        "phase",

        "task",

        "stimulus",

        "response",

        "correct",

        "reactionTime",

        "mode",

        "waitTime",

        "condition",

        "conditionOrder",

        "setNumber",

        "questionNumber"

    ];


    // CSV用の文字列変換

    function escapeCSV(value) {

        const text = String(value ?? "");

        return '"' + text.replace(/"/g, '""') + '"';

    }


    let csv =
        headers.map(escapeCSV).join(",") + "\r\n";


    results.forEach(result => {

        const row = headers.map(header => {

            return escapeCSV(result[header]);

        });

        csv += row.join(",") + "\r\n";

    });


    // Excel用BOM
    const blob = new Blob(

        ["\uFEFF" + csv],

        {
            type: "text/csv;charset=utf-8;"
        }

    );


    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =
        "calculation_experiment_result_" +
        participantId.replace(/[\\/:*?"<>|]/g, "_") +
        ".csv";

    document.body.appendChild(a);

    a.click();

    a.remove();

    setTimeout(() => {

        URL.revokeObjectURL(url);

    }, 1000);

}


// =======================
// 参加者番号入力
// =======================

participantNextButton.addEventListener("click", () => {

    participantId =
        participantIdInput.value.trim();


    // 1以上の整数か確認

    if (
        !/^\d+$/.test(participantId) ||
        Number(participantId) < 1
    ) {

        alert("参加者番号は1以上の整数で入力してください。");

        return;

    }


    showScreen(startScreen);

    saveProgress();

});


// =======================
// 実験開始
// =======================

startButton.addEventListener("click", () => {

    // 前回の保存データを削除
    clearSavedProgress();

    stopWaitTimer();

    waitDeadline = null;


    // 結果を初期化
    results = [];

    conditionIndex = 0;
    questionIndex = 0;

    basePhase = true;

    questionActive = false;

    currentSetNumber = null;


    // 条件を生成
    generateConditions();


    // 参加者番号に基づいて問題を生成
    generateQuestions();


    // ベースライン4問を準備
    generateBlockQuestions();


    // 最初の問題を表示
    generateQuestion();

    saveProgress();

});


// =======================
// YESボタン
// =======================

yesButton.addEventListener("click", () => {

    checkAnswer(true);

});


// =======================
// NOボタン
// =======================

noButton.addEventListener("click", () => {

    checkAnswer(false);

});


// =======================
// CSVダウンロード
// =======================

downloadButton.addEventListener("click", () => {

    downloadCSV();

});


// =======================
// 起動時の処理
// =======================

window.addEventListener("load", () => {

    checkForSavedProgress();

});


