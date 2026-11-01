
// ==================================================
// 計算課題 main.js
// タスクスイッチング課題と同じ構成
// ==================================================


// =======================
// 画面の取得
// =======================

const participantScreen =
    document.getElementById("participantScreen");

const participantIdInput =
    document.getElementById("participantId");

const participantNextButton =
    document.getElementById("participantNextButton");

const startButton =
    document.getElementById("startButton");

const startScreen =
    document.getElementById("startScreen");

const questionScreen =
    document.getElementById("questionScreen");

const stimulus =
    document.getElementById("stimulus");

const yesButton =
    document.getElementById("yesButton");

const noButton =
    document.getElementById("noButton");

const waitScreen =
    document.getElementById("waitScreen");

const waitLabel =
    document.getElementById("waitLabel");

const finishScreen =
    document.getElementById("finishScreen");

const downloadButton =
    document.getElementById("downloadButton");


// =======================
// 参加者情報
// =======================

let participantId = "";


// =======================
// 実験結果
// =======================

let results = [];


// =======================
// 保存設定
// =======================

const STORAGE_KEY =
    "calculationExperimentAutosave_v3";


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

const totalConditions = 15;


// =======================
// 実験状態
// =======================

let conditions = [];

let conditionIndex = 0;

let questionIndex = 0;

let basePhase = true;


// =======================
// 問題セット
// =======================

// ベースラインの問題
let baseQuestions = [];

// 全参加者共通の固定問題15セット
let conditionQuestionSets = [];

// 現在表示している4問
let blockQuestions = [];

// 現在のセット番号
let currentSetNumber = null;


// =======================
// 現在の問題情報
// =======================

let currentStimulus = "";

let currentAnswer = false;

let startTime = 0;

let questionActive = false;


// =======================
// 画面・待機情報
// =======================

let currentScreenName = "participant";

let waitDeadline = null;

let waitTimeout = null;

let waitInterval = null;


// ==================================================
// 画面表示
// ==================================================

function showScreen(screen) {

    if (screen === participantScreen) {
        currentScreenName = "participant";
    }

    else if (screen === startScreen) {
        currentScreenName = "start";
    }

    else if (screen === questionScreen) {
        currentScreenName = "question";
    }

    else if (screen === waitScreen) {
        currentScreenName = "wait";
    }

    else if (screen === finishScreen) {
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


// ==================================================
// 自動保存
// ==================================================

function saveProgress() {

    const state = {

        participantId,

        results,

        conditions,

        conditionIndex,

        questionIndex,

        basePhase,

        baseQuestions,

        conditionQuestionSets,

        blockQuestions,

        currentSetNumber,

        currentStimulus,

        currentAnswer,

        questionActive,

        currentScreenName,

        waitDeadline,

        savedAt: new Date().toISOString()

    };


    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

    }

    catch (error) {

        console.error(
            "自動保存に失敗しました。",
            error
        );

        alert(
            "自動保存に失敗しました。"
        );

    }

}


// ==================================================
// 保存データの取得
// ==================================================

function getSavedProgress() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        return saved
            ? JSON.parse(saved)
            : null;

    }

    catch (error) {

        console.error(
            "保存データの読み込みに失敗しました。",
            error
        );

        return null;

    }

}


// ==================================================
// 保存データの削除
// ==================================================

function clearSavedProgress() {

    localStorage.removeItem(STORAGE_KEY);

}


// ==================================================
// 待機タイマーの停止
// ==================================================

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


// ==================================================
// 途中再開
// ==================================================

function restoreProgress(state) {

    participantId =
        state.participantId || "";

    results =
        Array.isArray(state.results)
            ? state.results
            : [];

    conditions =
        Array.isArray(state.conditions)
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

    basePhase =
        state.basePhase !== false;


    baseQuestions =
        Array.isArray(state.baseQuestions)
            ? state.baseQuestions
            : [];

    conditionQuestionSets =
        Array.isArray(state.conditionQuestionSets)
            ? state.conditionQuestionSets
            : [];

    blockQuestions =
        Array.isArray(state.blockQuestions)
            ? state.blockQuestions
            : [];


    currentSetNumber =
        state.currentSetNumber ?? null;

    currentStimulus =
        state.currentStimulus || "";

    currentAnswer =
        Boolean(state.currentAnswer);


    waitDeadline =
        state.waitDeadline || null;


    participantIdInput.value =
        participantId;


    // 再開時は反応時間を新しく計測する
    questionActive = false;


    // 実験終了後
    if (state.currentScreenName === "finish") {

        showScreen(finishScreen);

        downloadButton.style.display =
            "inline-block";

        return;

    }


    // 待機中
    if (
        state.currentScreenName === "wait" &&
        waitDeadline !== null
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

        showScreen(questionScreen);

        generateQuestion();

        return;

    }


    // 開始画面
    showScreen(startScreen);

    saveProgress();

}


// ==================================================
// 保存データの確認
// ==================================================

function checkForSavedProgress() {

    const saved = getSavedProgress();


    if (
        !saved ||
        !saved.participantId ||
        !Array.isArray(saved.results)
    ) {

        showScreen(participantScreen);

        return;

    }


    const shouldResume = confirm(

        "前回の計算課題の保存データがあります。\n\n" +

        "参加者番号：" +
        saved.participantId + "\n" +

        "回答済み：" +
        saved.results.length + "問\n\n" +

        "OK：続きから再開\n" +

        "キャンセル：保存データを削除して新しく開始"

    );


    if (shouldResume) {

        restoreProgress(saved);

    }

    else {

        clearSavedProgress();

        showScreen(participantScreen);

    }

}


// ==================================================
// 配列のシャッフル
// ==================================================

function shuffleArray(array, random = Math.random) {

    const shuffled = [...array];

    for (
        let i = shuffled.length - 1;
        i > 0;
        i--
    ) {

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


// ==================================================
// 固定乱数の生成
// ==================================================

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

        return (
            seed >>> 0
        ) / 4294967296;

    };

}


// ==================================================
// 待機条件の生成
// ==================================================

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


    // 待機条件は毎回ランダム
    conditions = shuffleArray(conditions);


    console.log("===== 待機条件 =====");

    console.table(conditions);

}


// ==================================================
// 参加者番号によるセット割り当て
// ==================================================

function getAssignedSetIndex(conditionArrayIndex) {

    const participantNumber =
        Number(participantId);

    const offset =
        (participantNumber - 1) % totalConditions;


    return (
        conditionArrayIndex - offset +
        totalConditions
    ) % totalConditions;

}


// ==================================================
// 計算問題の候補を生成
// ==================================================

function createCalculationPools() {

    const addCorrect = [];

    const addIncorrect = [];

    const subCorrect = [];

    const subIncorrect = [];


    const seen = new Set();


    function addProblem(
        pool,
        stimulus,
        answer
    ) {

        if (seen.has(stimulus)) {
            return;
        }

        seen.add(stimulus);

        pool.push({

            stimulus: stimulus,

            answer: answer

        });

    }


    // --------------------------------
    // 問題生成
    // --------------------------------

    for (let a = 20; a <= 99; a++) {

        for (let b = 20; b <= 99; b++) {


            // =======================
            // 足し算
            // =======================

            // 繰り上がりあり
            // 答えは2桁

            if (
                (a % 10) + (b % 10) >= 10 &&
                a + b <= 99
            ) {

                const ans = a + b;


                // 正解問題

                addProblem(

                    addCorrect,

                    `${a} + ${b} = ${ans}`,

                    true

                );


                // 誤答問題（±10）

                for (const wrong of [
                    ans - 10,
                    ans + 10
                ]) {

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


            // =======================
            // 引き算
            // =======================

            // 繰り下がりあり
            // 答えは2桁

            if (
                a > b &&
                (a % 10) < (b % 10) &&
                a - b >= 10
            ) {

                const ans = a - b;


                // 正解問題

                addProblem(

                    subCorrect,

                    `${a} - ${b} = ${ans}`,

                    true

                );


                // 誤答問題（±10）

                for (const wrong of [
                    ans - 10,
                    ans + 10
                ]) {

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


    return [

        addCorrect,

        addIncorrect,

        subCorrect,

        subIncorrect

    ];

}


// ==================================================
// 全参加者共通の固定問題15セットを生成
// ==================================================

function generateQuestions() {

    // 参加者番号に関係なく同じ乱数
    const random = createSeededRandom(
        "CALCULATION_FIXED_SET_V1"
    );


    const pools = createCalculationPools();


    const selectedPools = [];


    // --------------------------------
    // 4種類からそれぞれ15問選ぶ
    // --------------------------------

    for (const pool of pools) {

        const shuffled = shuffleArray(
            pool,
            random
        );


        if (shuffled.length < 15) {

            throw new Error(
                "問題数が不足しています。"
            );

        }


        selectedPools.push(
            shuffled.slice(0, 15)
        );

    }


    // --------------------------------
    // 15セットを作成
    // --------------------------------

    const blocks = [];


    for (let i = 0; i < 15; i++) {

        const block = [

            selectedPools[0][i],

            selectedPools[1][i],

            selectedPools[2][i],

            selectedPools[3][i]

        ];


        // セット内の問題順を固定
        blocks.push(
            shuffleArray(block, random)
        );

    }


    // セットの順番も固定
    conditionQuestionSets = shuffleArray(
        blocks,
        random
    );


    console.log(
        "===== 全参加者共通の固定問題 ====="
    );


    conditionQuestionSets.forEach(
        (set, index) => {

            console.log(
                `固定セット${index + 1}`,
                set
            );

        }
    );


    console.log(
        "固定問題セット数：",
        conditionQuestionSets.length
    );

}


// ==================================================
// 4問分の問題を準備
// ==================================================

function generateBlockQuestions(setIndex = null) {


    // =======================
    // ベースライン
    // =======================

    if (setIndex === null) {

        const pools = createCalculationPools();


        // 4種類から1問ずつランダムに選ぶ

        blockQuestions = pools.map(pool => {

            const randomIndex = Math.floor(
                Math.random() * pool.length
            );

            return {
                ...pool[randomIndex]
            };

        });


        // 問題順もランダム

        blockQuestions = shuffleArray(
            blockQuestions
        );


        baseQuestions = blockQuestions.map(
            question => ({ ...question })
        );


        currentSetNumber = null;

    }


    // =======================
    // 条件課題
    // =======================

    else {

        if (
            setIndex < 0 ||
            setIndex >= conditionQuestionSets.length
        ) {

            console.error(
                "問題セットの指定が不正です。",
                setIndex
            );

            return;

        }


        blockQuestions =
            conditionQuestionSets[setIndex].map(
                question => ({ ...question })
            );


        currentSetNumber = setIndex + 1;

    }


    questionIndex = 0;

    saveProgress();

}


// ==================================================
// 問題表示
// ==================================================

function generateQuestion() {

    if (
        questionIndex >= blockQuestions.length
    ) {

        return;

    }


    const question =
        blockQuestions[questionIndex];


    currentStimulus =
        question.stimulus;

    currentAnswer =
        question.answer;


    stimulus.textContent =
        currentStimulus;


    questionActive = true;


    yesButton.disabled = false;

    noButton.disabled = false;


    // 反応時間の計測開始
    startTime = performance.now();


    showScreen(questionScreen);

    saveProgress();

}


// ==================================================
// 待機画面
// ==================================================

function startWaitScreen(remainingMs = null) {

    questionActive = false;

    yesButton.disabled = true;

    noButton.disabled = true;


    stopWaitTimer();


    const currentCondition =
        conditions[conditionIndex];


    if (!currentCondition) {
        return;
    }


    const waitTime =
        currentCondition.waitTime;

    const mode =
        currentCondition.mode;


    const totalWaitMs =
        waitTime * 1000;


    const actualRemainingMs =
        remainingMs === null
            ? totalWaitMs
            : Math.max(0, remainingMs);


    waitDeadline =
        Date.now() + actualRemainingMs;


    showScreen(waitScreen);

    saveProgress();


    // =======================
    // 表示なし
    // =======================

    if (mode === "none") {

        waitLabel.textContent =
            "お待ちください";

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
                Math.min(
                    waitTime,
                    elapsedSeconds
                ) +
                "秒";

        };


        updateElapsed();


        waitInterval = setInterval(

            updateElapsed,

            100

        );

    }


    // =======================
    // 待機終了
    // =======================

    waitTimeout = setTimeout(() => {

        stopWaitTimer();

        waitDeadline = null;


        // 参加者番号に応じたセットを取得

        const setIndex =
            getAssignedSetIndex(conditionIndex);


        generateBlockQuestions(setIndex);

        generateQuestion();

        saveProgress();

    }, actualRemainingMs);

}


// ==================================================
// 回答処理
// ==================================================

function checkAnswer(userPressedYes) {

    // 二重回答防止

    if (!questionActive) {
        return;
    }


    questionActive = false;


    yesButton.disabled = true;

    noButton.disabled = true;


    // =======================
    // 反応時間
    // =======================

    const reactionTime =
        performance.now() - startTime;


    // =======================
    // 正誤判定
    // =======================

    const correct =
        userPressedYes === currentAnswer;


    // =======================
    // 実験フェーズ
    // =======================

    const phase =
        basePhase
            ? "base"
            : "condition";


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

        response: userPressedYes
            ? "YES"
            : "NO",

        correct: correct,

        reactionTime: reactionTime.toFixed(1),

        mode: mode,

        waitTime: waitTime,

        condition: basePhase
            ? "base"
            : conditions[conditionIndex].id,

        conditionOrder: basePhase
            ? "base"
            : conditionIndex + 1,

        setNumber: basePhase
            ? "base"
            : currentSetNumber,

        questionNumber: questionIndex + 1

    });


    console.log(
        results[results.length - 1]
    );


    // 次の問題番号へ
    questionIndex++;


    // 回答直後に自動保存
    saveProgress();


    // =======================
    // 4問終了
    // =======================

    if (questionIndex >= blockSize) {


        // --------------------------------
        // ベースライン終了
        // --------------------------------

        if (basePhase) {

            basePhase = false;

            conditionIndex = 0;

            startWaitScreen();

            return;

        }


        // --------------------------------
        // 最後の条件終了
        // --------------------------------

        if (
            conditionIndex ===
            conditions.length - 1
        ) {

            questionActive = false;

            waitDeadline = null;

            stopWaitTimer();


            showScreen(finishScreen);


            downloadButton.style.display =
                "inline-block";


            saveProgress();

            return;

        }


        // --------------------------------
        // 次の条件へ
        // --------------------------------

        conditionIndex++;

        startWaitScreen();

        return;

    }


    // =======================
    // 次の問題を表示
    // =======================

    generateQuestion();

}


// ==================================================
// CSV保存
// ==================================================

function downloadCSV() {

    if (results.length === 0) {

        alert(
            "保存する実験結果がありません。"
        );

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

        return (
            '"' +
            text.replace(/"/g, '""') +
            '"'
        );

    }


    let csv =
        headers.map(escapeCSV).join(",") +
        "\r\n";


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


    const url =
        URL.createObjectURL(blob);


    const a =
        document.createElement("a");


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


// ==================================================
// 参加者番号入力
// ==================================================

participantNextButton.addEventListener(
    "click",
    () => {

        participantId =
            participantIdInput.value.trim();


        // 1以上の整数か確認

        if (
            !/^\d+$/.test(participantId) ||
            Number(participantId) < 1
        ) {

            alert(
                "参加者番号は1以上の整数で入力してください。"
            );

            return;

        }


        showScreen(startScreen);

        saveProgress();

    }
);


// ==================================================
// 実験開始
// ==================================================

startButton.addEventListener(
    "click",
    () => {

        // 古い保存データを削除

        clearSavedProgress();

        stopWaitTimer();

        waitDeadline = null;


        // =======================
        // 状態を初期化
        // =======================

        results = [];

        conditionIndex = 0;

        questionIndex = 0;

        basePhase = true;

        questionActive = false;

        currentSetNumber = null;

        currentStimulus = "";

        currentAnswer = false;


        // =======================
        // 待機条件を生成
        // =======================

        generateConditions();


        // =======================
        // 固定問題15セットを生成
        // =======================

        generateQuestions();


        // =======================
        // ベースライン4問を生成
        // =======================

        generateBlockQuestions();


        // =======================
        // 最初の問題を表示
        // =======================

        generateQuestion();

        saveProgress();

    }
);


// ==================================================
// YESボタン
// ==================================================

yesButton.addEventListener(
    "click",
    () => {

        checkAnswer(true);

    }
);


// ==================================================
// NOボタン
// ==================================================

noButton.addEventListener(
    "click",
    () => {

        checkAnswer(false);

    }
);


// ==================================================
// CSVダウンロードボタン
// ==================================================

downloadButton.addEventListener(
    "click",
    () => {

        downloadCSV();

    }
);


// ==================================================
// 起動時の処理
// ==================================================

window.addEventListener(
    "load",
    () => {

        downloadButton.style.display = "none";

        checkForSavedProgress();

    }
);
