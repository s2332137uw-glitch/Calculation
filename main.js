
// =======================
// 画面
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


// =======================
// 自動保存・途中再開
// =======================

const STORAGE_KEY =
    "calculationExperimentAutosave_v2";

let nextStep = "participant";

let waitDeadline = null;
let waitTimeout = null;
let waitInterval = null;


function saveProgress() {

    const progress = {

        participantId,
        results,
        conditions,
        conditionIndex,
        questionPool,
        answerPool,
        questions,
        answers,
        questionIndex,
        basePhase,
        nextStep,
        waitDeadline

    };

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(progress)
        );

    } catch (error) {

        console.error(
            "自動保存に失敗しました：",
            error
        );

        alert(
            "結果の自動保存に失敗しました。" +
            "CSVを保存してください。"
        );

    }

}


function clearProgress() {

    try {

        localStorage.removeItem(STORAGE_KEY);

    } catch (error) {

        console.error(
            "自動保存データを削除できませんでした：",
            error
        );

    }

}


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


function restoreProgress(progress) {

    participantId = progress.participantId || "";

    results = Array.isArray(progress.results)
        ? progress.results
        : [];

    conditions = Array.isArray(progress.conditions)
        ? progress.conditions
        : [];

    conditionIndex =
        Number.isInteger(progress.conditionIndex)
            ? progress.conditionIndex
            : 0;

    questionPool = progress.questionPool || [];
    answerPool = progress.answerPool || [];

    questions = progress.questions || [];
    answers = progress.answers || [];

    questionIndex =
        Number.isInteger(progress.questionIndex)
            ? progress.questionIndex
            : 0;

    basePhase = progress.basePhase !== false;

    nextStep = progress.nextStep || "question";

    waitDeadline = progress.waitDeadline || null;

    participantIdInput.value = participantId;

    // 全画面を一度非表示にする
    participantScreen.style.display = "none";
    startScreen.style.display = "none";
    questionScreen.style.display = "none";
    waitScreen.style.display = "none";
    finishScreen.style.display = "none";

    // 実験終了後
    if (nextStep === "finish") {

        finishScreen.style.display = "block";

        downloadButton.style.display = "inline-block";

        return;

    }

    // 待機中だった場合
    if (
        nextStep === "waitBase" ||
        nextStep === "waitCondition"
    ) {

        const remainingMs = waitDeadline
            ? Math.max(0, waitDeadline - Date.now())
            : null;

        startWaitScreen(remainingMs);

        return;

    }

    // 問題回答中だった場合
    if (
        nextStep === "question" &&
        questionIndex < questions.length
    ) {

        questionScreen.style.display = "block";

        showQuestion();

        return;

    }

    // その他の場合
    participantScreen.style.display = "block";

}


function checkForSavedProgress() {

    let savedText;

    try {

        savedText = localStorage.getItem(STORAGE_KEY);

    } catch (error) {

        console.error(
            "自動保存データを読み込めませんでした：",
            error
        );

        return;

    }

    if (!savedText) return;

    try {

        const progress = JSON.parse(savedText);

        if (
            !progress.participantId ||
            !Array.isArray(progress.results)
        ) {

            clearProgress();

            return;

        }

        const resume = confirm(

            "前回の実験データが保存されています。\n" +
            "参加者番号：" + progress.participantId + "\n" +
            "回答済み：" + progress.results.length + "問\n\n" +
            "OK：途中から再開する\n" +
            "キャンセル：保存データを削除する"

        );

        if (resume) {

            restoreProgress(progress);

        } else {

            clearProgress();

        }

    } catch (error) {

        console.error(
            "保存データを読み込めませんでした：",
            error
        );

        clearProgress();

        alert(
            "保存データを読み込めなかったため、" +
            "新しく実験を開始します。"
        );

    }

}


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

let conditions = [];

let conditionIndex = 0;


// =======================
// 問題設定
// =======================

// 1ブロック4問
const blockSize = 4;

// ベースライン1ブロック
// 条件課題15ブロック
const totalBlocks = 16;

// 合計64問
const totalQuestions =
    blockSize * totalBlocks;


// =======================
// 問題データ
// =======================

let questionPool = [];
let answerPool = [];

let questions = [];
let answers = [];

let questionIndex = 0;


// =======================
// ベース課題かどうか
// =======================

let basePhase = true;


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

    // 待機条件だけをシャッフル
    for (
        let i = conditions.length - 1;
        i > 0;
        i--
    ) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [
            conditions[i],
            conditions[j]
        ] = [
            conditions[j],
            conditions[i]
        ];

    }

    console.log("===== 条件一覧 =====");

    conditions.forEach((condition, index) => {

        console.log(

            (index + 1) +
            " : " +
            condition.mode +
            " " +
            condition.waitTime +
            "秒"

        );

    });

}


// =======================
// 問題セットの割り当て
// =======================

// 参加者1：セット1→2→3→...
// 参加者2：セット15→1→2→...
// 参加者3：セット14→15→1→...

function getAssignedSetIndex(conditionArrayIndex) {

    const participantNumber =
        Number(participantId);

    const offset =
        (participantNumber - 1) % 15;

    return (
        conditionArrayIndex - offset + 15
    ) % 15;

}


// =======================
// 計算問題生成
// =======================

function generateQuestions() {

    // 参加者番号に基づいた乱数
    const random =
        createSeededRandom(participantId);


    // =======================
    // シャッフル関数
    // =======================

    function shuffle(array) {

        for (
            let i = array.length - 1;
            i > 0;
            i--
        ) {

            const j = Math.floor(
                random() * (i + 1)
            );

            [
                array[i],
                array[j]
            ] = [
                array[j],
                array[i]
            ];

        }

        return array;

    }


    // =======================
    // 問題を4種類に分ける
    // =======================

    const addCorrect = [];
    const addIncorrect = [];

    const subCorrect = [];
    const subIncorrect = [];

    // 問題の重複を防ぐ
    const seen = new Set();


    function addProblem(pool, stimulus, answer) {

        if (seen.has(stimulus)) return;

        seen.add(stimulus);

        pool.push({

            stimulus: stimulus,

            answer: answer

        });

    }


    // =======================
    // 問題を生成
    // =======================

    for (let a = 20; a <= 99; a++) {

        for (let b = 20; b <= 99; b++) {


            // =======================
            // 足し算：繰り上がりあり
            // 答えは2桁
            // =======================

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


                // 誤答は正解の±10
                for (
                    const wrong of [
                        ans - 10,
                        ans + 10
                    ]
                ) {

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
            // 引き算：繰り下がりあり
            // 答えは2桁
            // =======================

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


                // 誤答は正解の±10
                for (
                    const wrong of [
                        ans - 10,
                        ans + 10
                    ]
                ) {

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
    // 各種類から16問ずつ選ぶ
    // 合計64問
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


    for (const pool of pools) {

        shuffle(pool.data);

        if (pool.data.length < 16) {

            throw new Error(

                pool.name +
                "の問題が16問未満です：" +
                pool.data.length +
                "問"

            );

        }

        selectedPools.push(
            pool.data.slice(0, 16)
        );

    }


    // =======================
    // 4問ずつのブロックを作成
    // 各ブロックに4種類を1問ずつ入れる
    // =======================

    const blocks = [];

    for (let i = 0; i < 16; i++) {

        const block = [

            selectedPools[0][i],

            selectedPools[1][i],

            selectedPools[2][i],

            selectedPools[3][i]

        ];

        shuffle(block);

        blocks.push(block);

    }


    // ブロックの順番もシャッフル
    shuffle(blocks);


    // =======================
    // 実験で使用する配列に格納
    // =======================

    questionPool = [];
    answerPool = [];

    questions = [];
    answers = [];


    for (const block of blocks) {

        for (const problem of block) {

            questionPool.push(
                problem.stimulus
            );

            answerPool.push(
                problem.answer
            );

            questions.push(
                problem.stimulus
            );

            answers.push(
                problem.answer
            );

        }

    }


    // =======================
    // 問題構成を確認
    // =======================

    console.log("===== 問題構成 =====");

    console.log(
        "合計問題数：",
        questions.length
    );

    console.log(
        "正しい問題：",
        answers.filter(answer => answer).length
    );

    console.log(
        "間違った問題：",
        answers.filter(answer => !answer).length
    );

    console.log(
        "足し算：",
        questions.filter(q => q.includes("+")).length
    );

    console.log(
        "引き算：",
        questions.filter(q => q.includes("-")).length
    );


    console.log("===== ブロック別の問題 =====");

    for (let i = 0; i < 16; i++) {

        console.log(

            `ブロック${i + 1}`,

            questions.slice(
                i * 4,
                i * 4 + 4
            )

        );

    }

}


// =======================
// 問題表示
// =======================

function showQuestion() {

    if (questionIndex >= questions.length) {
        return;
    }

    currentStimulus =
        questions[questionIndex];

    currentAnswer =
        answers[questionIndex];

    stimulus.textContent =
        currentStimulus;

    questionActive = true;

    yesButton.disabled = false;
    noButton.disabled = false;

    // 反応時間計測開始
    startTime = performance.now();

    nextStep = "question";

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

    nextStep = basePhase
        ? "waitBase"
        : "waitCondition";

    questionScreen.style.display = "none";
    waitScreen.style.display = "block";

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
    // 待機終了後
    // =======================

    waitTimeout = setTimeout(() => {

        stopWaitTimer();

        waitDeadline = null;


        // =======================
        // ベース課題終了後
        // =======================

        if (basePhase) {

            basePhase = false;

            const setIndex =
                getAssignedSetIndex(conditionIndex);

            // ブロック1～15のどれかを選択
            questionIndex =
                (setIndex + 1) * blockSize;

            nextStep = "question";

            waitScreen.style.display = "none";
            questionScreen.style.display = "block";

            saveProgress();

            showQuestion();

            return;

        }


        // =======================
        // 条件課題
        // =======================

        if (conditionIndex < conditions.length) {

            const setIndex =
                getAssignedSetIndex(conditionIndex);

            questionIndex =
                (setIndex + 1) * blockSize;

            nextStep = "question";

            waitScreen.style.display = "none";
            questionScreen.style.display = "block";

            saveProgress();

            showQuestion();

            return;

        }


        // =======================
        // 全条件終了
        // =======================

        nextStep = "finish";

        waitScreen.style.display = "none";
        questionScreen.style.display = "none";
        finishScreen.style.display = "block";

        downloadButton.style.display = "inline-block";

        saveProgress();

    }, actualRemainingMs);

}


// =======================
// 正解判定・結果保存
// =======================

function checkAnswer(userPressedYes) {

    // 二重回答を防止
    if (!questionActive) {
        return;
    }

    if (questionIndex >= questions.length) {
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
    // 正解判定
    // =======================

    const correct =
        userPressedYes === answers[questionIndex];


    // =======================
    // 結果を記録
    // =======================

    const assignedSetIndex =
        basePhase
            ? null
            : getAssignedSetIndex(conditionIndex);


    results.push({

        participantId: participantId,

        phase: basePhase
            ? "base"
            : "condition",

        task: "CALCULATION",

        stimulus: questions[questionIndex],

        response: userPressedYes
            ? "YES"
            : "NO",

        correct: correct,

        reactionTime: reactionTime.toFixed(1),

        mode: basePhase
            ? "none"
            : conditions[conditionIndex].mode,

        waitTime: basePhase
            ? 0
            : conditions[conditionIndex].waitTime,

        condition: basePhase
            ? "base"
            : conditions[conditionIndex].id,

        conditionOrder: basePhase
            ? "base"
            : conditionIndex + 1,

        setNumber: basePhase
            ? "base"
            : assignedSetIndex + 1,

        questionNumber:
            (questionIndex % blockSize) + 1

    });


    console.log(
        results[results.length - 1]
    );


    // =======================
    // 次の問題番号へ
    // =======================

    questionIndex++;


    // =======================
    // 回答直後に保存
    // =======================

    saveProgress();


    // =======================
    // 4問終了後
    // =======================

    if (questionIndex % blockSize === 0) {


        // =======================
        // ベースライン終了
        // =======================

        if (basePhase) {

            nextStep = "waitBase";

            saveProgress();

            startWaitScreen();

            return;

        }


        // =======================
        // 最後の条件終了
        // =======================

        if (
            conditionIndex ===
            conditions.length - 1
        ) {

            nextStep = "finish";

            saveProgress();

            questionScreen.style.display = "none";
            waitScreen.style.display = "none";
            finishScreen.style.display = "block";

            downloadButton.style.display = "inline-block";

            return;

        }


        // =======================
        // 次の条件へ
        // =======================

        conditionIndex++;

        nextStep = "waitCondition";

        saveProgress();

        startWaitScreen();

        return;

    }


    // =======================
    // ブロック途中
    // =======================

    nextStep = "question";

    saveProgress();

    showQuestion();

}


// =======================
// CSV保存
// =======================

function downloadCSV() {

    if (results.length === 0) {

        alert("保存する実験結果がありません。");

        return;

    }


    // =======================
    // CSVの見出し
    // =======================

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


    // =======================
    // CSV用の文字列変換
    // =======================

    function escapeCSV(value) {

        const text = String(value ?? "");

        return '"' + text.replace(/"/g, '""') + '"';

    }


    let csv =
        "\uFEFF" +
        headers.map(escapeCSV).join(",") +
        "\r\n";


    // =======================
    // 結果をCSVに追加
    // =======================

    results.forEach(result => {

        const row = headers.map(header => {

            return escapeCSV(result[header]);

        });

        csv += row.join(",") + "\r\n";

    });


    // =======================
    // CSVファイル作成
    // =======================

    const blob = new Blob(

        [csv],

        {
            type: "text/csv;charset=utf-8;"
        }

    );


    // =======================
    // ダウンロード
    // =======================

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

    document.body.removeChild(a);

    setTimeout(() => {

        URL.revokeObjectURL(url);

    }, 1000);

}


// =======================
// 参加者番号入力
// =======================

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


        // 新しい実験を開始する
        clearProgress();

        stopWaitTimer();

        results = [];

        conditions = [];

        conditionIndex = 0;

        questionPool = [];
        answerPool = [];

        questions = [];
        answers = [];

        questionIndex = 0;

        basePhase = true;

        nextStep = "participant";

        waitDeadline = null;


        participantScreen.style.display = "none";

        startScreen.style.display = "block";

    }
);


// =======================
// 実験開始
// =======================

startButton.addEventListener(
    "click",
    () => {

        startScreen.style.display = "none";

        // 条件を生成してシャッフル
        generateConditions();

        // 参加者番号に基づいて問題を生成
        generateQuestions();


        // =======================
        // 初期状態
        // =======================

        questionIndex = 0;

        conditionIndex = 0;

        basePhase = true;

        questionActive = false;

        nextStep = "question";

        waitDeadline = null;


        questionScreen.style.display = "block";

        waitScreen.style.display = "none";

        finishScreen.style.display = "none";


        // 初期状態を保存
        saveProgress();

        showQuestion();

    }
);


// =======================
// YESボタン
// =======================

yesButton.addEventListener(
    "click",
    () => {

        checkAnswer(true);

    }
);


// =======================
// NOボタン
// =======================

noButton.addEventListener(
    "click",
    () => {

        checkAnswer(false);

    }
);


// =======================
// CSV保存ボタン
// =======================

downloadButton.addEventListener(
    "click",
    () => {

        downloadCSV();

    }
);


// =======================
// ページ読み込み時
// 保存データを確認
// =======================

window.addEventListener(
    "load",
    () => {

        checkForSavedProgress();

    }
);
