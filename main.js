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

let participantId = "";

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
// 現在の問題
// =======================

let currentStimulus = "";
let currentAnswer = false;
let startTime = 0;

// =======================
// 結果保存
// =======================

let results = [];

// =======================
// 自動保存・途中再開
// =======================

const STORAGE_KEY = "calculationExperimentAutosave_v1";

let nextStep = "participant";

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
        nextStep
    };

    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(progress)
        );
    } catch (error) {
        console.error("自動保存に失敗しました：", error);

        alert(
            "結果の自動保存に失敗しました。" +
            "保存ボタンからCSVを保存してください。"
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

function restoreProgress(progress) {
    participantId = progress.participantId || "";
    results = progress.results || [];
    conditions = progress.conditions || [];
    conditionIndex = progress.conditionIndex || 0;
    questionPool = progress.questionPool || [];
    answerPool = progress.answerPool || [];
    questions = progress.questions || [];
    answers = progress.answers || [];
    questionIndex = progress.questionIndex || 0;
    basePhase = progress.basePhase !== false;
    nextStep = progress.nextStep || "question";

    participantIdInput.value = participantId;

    participantScreen.style.display = "none";
    startScreen.style.display = "none";
    questionScreen.style.display = "none";
    waitScreen.style.display = "none";
    finishScreen.style.display = "none";

    if (nextStep === "finish") {
        finishScreen.style.display = "block";
        downloadButton.style.display = "inline-block";
        return;
    }

    if (
        nextStep === "waitBase" ||
        nextStep === "waitCondition"
    ) {
        startWaitScreen();
        return;
    }

    questionScreen.style.display = "block";
    nextStep = "question";
    showQuestion();
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
            "前回の実験データがこのブラウザに保存されています。\n" +
            "参加者番号：" + progress.participantId + "\n" +
            "回答済み：" + progress.results.length + "問\n\n" +
            "「OK」で途中から再開します。\n" +
            "「キャンセル」で保存データを破棄し、新しい実験を始めます。"
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

// ベースライン4問
// 条件15個 × 4問
// 合計16ブロック
const totalBlocks = 16;

// 合計64問
const totalQuestions =
    blockSize * totalBlocks;

// =======================
// 問題
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
// 条件生成
// =======================

function generateConditions() {
    conditions = [];

    for (const mode of modes) {
        for (const time of waitTimes) {
            conditions.push({
                mode: mode,
                waitTime: time
            });
        }
    }

    // 条件をシャッフル
    for (
        let i = conditions.length - 1;
        i > 0;
        i--
    ) {
        const j =
            Math.floor(
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
// 計算問題生成
// =======================

function generateQuestions() {

    // 問題をシャッフルする関数
    function shuffle(array) {
        for (
            let i = array.length - 1;
            i > 0;
            i--
        ) {
            const j =
                Math.floor(Math.random() * (i + 1));

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

    // 問題を4種類に分ける
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

    // 問題を生成
    for (let a = 20; a <= 99; a++) {
        for (let b = 20; b <= 99; b++) {

            // 足し算：繰り上がりあり
            // 答えは2桁
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

            // 引き算：繰り下がりあり
            // 答えは2桁
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

    // 各種類から16問ずつ選ぶ
    // 合計64問
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

    // 4問ずつのブロックを作成
    // 各ブロックに4種類を1問ずつ入れる
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

    // ブロックの順番もランダムにする
    shuffle(blocks);

    // 実験で使用する配列に格納
    questionPool = [];
    answerPool = [];
    questions = [];
    answers = [];

    for (const block of blocks) {
        for (const problem of block) {
            questionPool.push(problem.stimulus);
            answerPool.push(problem.answer);

            questions.push(problem.stimulus);
            answers.push(problem.answer);
        }
    }

    console.log(
        "===== 問題構成 ====="
    );

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

    console.log(
        "===== ブロック別の問題 ====="
    );

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
    currentStimulus =
        questions[questionIndex];

    currentAnswer =
        answers[questionIndex];

    stimulus.textContent =
        currentStimulus;

    // 反応時間計測開始
    startTime =
        performance.now();
}

// =======================
// 待機画面
// =======================

function startWaitScreen() {
    downloadButton.style.display = "none";

    const currentCondition =
        conditions[conditionIndex];

    const waitTime =
        currentCondition.waitTime;

    const mode =
        currentCondition.mode;

    questionScreen.style.display = "none";
    waitScreen.style.display = "block";

    // 表示なし
    if (mode === "none") {
        waitLabel.textContent =
            "お待ちください";
    }

    // 残り時間
    else if (mode === "remaining") {
        let remain = waitTime;

        waitLabel.textContent =
            "残り時間：" +
            remain +
            "秒";

        if (waitTime > 0) {
            const timer = setInterval(() => {
                remain--;

                if (remain > 0) {
                    waitLabel.textContent =
                        "残り時間：" +
                        remain +
                        "秒";
                }

                if (remain <= 0) {
                    clearInterval(timer);
                }
            }, 1000);
        }
    }

    // 経過時間
    else {
        let elapsed = 0;

        waitLabel.textContent =
            "経過時間：0秒";

        if (waitTime > 0) {
            const timer = setInterval(() => {
                elapsed++;

                waitLabel.textContent =
                    "経過時間：" +
                    elapsed +
                    "秒";

                if (elapsed >= waitTime) {
                    clearInterval(timer);
                }
            }, 1000);
        }
    }

    // 待機終了後
    setTimeout(() => {

        // ベース課題終了後
        if (basePhase) {
            basePhase = false;

            questionIndex = blockSize;
            nextStep = "question";

            waitScreen.style.display = "none";
            questionScreen.style.display = "block";

            saveProgress();
            showQuestion();

            return;
        }

        // 条件が残っている場合
        if (
            conditionIndex <
            conditions.length
        ) {
            nextStep = "question";

            waitScreen.style.display = "none";
            questionScreen.style.display = "block";

            saveProgress();
            showQuestion();

            return;
        }

        // 全条件終了
        nextStep = "finish";

        waitScreen.style.display = "none";
        questionScreen.style.display = "none";
        finishScreen.style.display = "block";

        downloadButton.style.display = "inline-block";

        saveProgress();

    }, waitTime * 1000);
}

// =======================
// 正解判定・結果保存
// =======================

function checkAnswer(userPressedYes) {

    // 反応時間
    const reactionTime =
        performance.now() - startTime;

    // 正解判定
    const correct =
        userPressedYes ===
        answers[questionIndex];

    // 結果を追加
    results.push({

    participantId: participantId,

    phase: basePhase ? "base" : "condition",

    task: "CALCULATION",

    stimulus: questions[questionIndex],

    response: userPressedYes ? "YES" : "NO",

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
        : conditionIndex,

    questionNumber: (questionIndex % blockSize) + 1

});

    // 次の問題へ
    questionIndex++;

    // 4問ごとのブロック終了時
    if (questionIndex % blockSize === 0) {

        // 最後の条件まで終了
        if (
            !basePhase &&
            conditionIndex === conditions.length - 1
        ) {
            nextStep = "finish";

            // 最後の回答も保存
            saveProgress();

            waitScreen.style.display = "none";
            questionScreen.style.display = "none";
            finishScreen.style.display = "block";

            downloadButton.style.display = "inline-block";

            return;
        }

        // ベースライン終了後
        if (basePhase) {
            nextStep = "waitBase";

            saveProgress();
            startWaitScreen();

            return;
        }

        // 条件の4問が終了したら次の条件へ
        conditionIndex++;

        nextStep = "waitCondition";

        saveProgress();
        startWaitScreen();

        return;
    }

    // ブロック途中：次の問題を表示する前に保存
    nextStep = "question";

    saveProgress();
    showQuestion();
}

// =======================
// CSV保存
// =======================

function downloadCSV() {

    // CSVの見出し
    let csv =
        "\uFEFFparticipantId,phase,task,stimulus,correct,reactionTime,mode,waitTime,condition\n";

    // 結果をCSVに追加
    results.forEach((r) => {
        csv +=
            participantId + "," +
            r.phase + "," +
            r.task + "," +
            r.stimulus + "," +
            r.correct + "," +
            r.reactionTime + "," +
            r.mode + "," +
            r.waitTime + "," +
            r.condition +
            "\n";
    });

    // CSVファイル作成
    const blob = new Blob(
        [csv],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    // ダウンロード
    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download =
        "calculation_experiment_result_" +
        participantId +
        ".csv";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// =======================
// 参加者番号入力
// =======================

participantNextButton.addEventListener(
    "click",
    () => {

        participantId =
            participantIdInput.value.trim();

        // 未入力なら次に進まない
        if (participantId === "") {
            alert(
                "参加者番号を入力してください。"
            );
            return;
        }

        // 新しい実験を始める
        clearProgress();

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

        // 条件を作る
        generateConditions();

        // 計算問題を64問作る
        generateQuestions();

        // 初期状態
        questionIndex = 0;
        conditionIndex = 0;
        basePhase = true;
        nextStep = "question";

        questionScreen.style.display = "block";

        // 初期状態も保存
        saveProgress();

        showQuestion();
    }
);

// =======================
// YES
// =======================

yesButton.addEventListener(
    "click",
    () => {
        checkAnswer(true);
    }
);

// =======================
// NO
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
// 前回の保存データを確認
// =======================

checkForSavedProgress();
