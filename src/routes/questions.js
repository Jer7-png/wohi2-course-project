const express = require("express")
const router = express.Router()
const prisma = require("../lib/prisma")
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "public", "uploads"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now() } -${Math.random().toString(36).slice(2, 8) }${ext}`)
    }
})

const upload = multer({
    storage, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only images are allowed"));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
})

router.use(authenticate);

function formatQuestion(question) {
    return {
        ...question,
        keywords: question.keywords.map((k) => k.name),
        userName: question.user?.name || null,
        solved: question.attempts ? question.attempts.length > 0 : false,
        user: undefined,
        attempts: undefined,
    }
}

router.get("/", async (req, res) => {

    const {keyword} = req.query

    const where = keyword
    ? { keywords: { some: {name: keyword } } }
    : {}

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    const [filteredQuestions, total] = await Promise.all([
        await prisma.question.findMany( {
        where,
        include: {
            keywords: true,
            user: true,
            attempts: {
                where: {userId: req.user.userId, correct: true},
                take: 1,
            }
                },
        orderBy: { id: "asc"},
        skip,
        take: limit
    }),
    prisma.question.count({ where })
    ])
    

    res.json({
        data: filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
    })
})

router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId)
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { keywords: true,
            user: true,
        },
    })

    if (!question) {
        return res.status(404).json({message: "Question not found"})
    }

    res.json(formatQuestion(question))
})

router.post("/", upload.single("image"), async (req, res) => {
    const {question, answer, keywords} = req.body
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!question || !answer) {
        return res.status(400).json({msg: "question and answer are mandatory"})
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : []

    const newQuestion = await prisma.question.create({
        data: {
            question,
            answer,
            imageUrl,
            userId: req.user.userId,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw }, create: { name: kw },
                })),
            },
        },
        include: { keywords: true },
    })
    res.status(201).json(formatQuestion(newQuestion))
})

router.put("/:questionId", upload.single("image"), isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId)
    const {question, answer, keywords} = req.body
    const existingQuestion = await prisma.question.findUnique({where: { id: questionId }})
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    if (!existingQuestion) {
        return res.status(404).json({ message: "Question not found" })
    }

    if (!question || !answer) {
        return res.status(400).json({ message: "question and answer are mandatory" })
    }
    const keywordsArray = Array.isArray(keywords) ? keywords: []
    const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
            question, answer, imageUrl,
            keywords: {
                set: [],
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true },
    })
    res.json(formatQuestion(updatedQuestion))
})

router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId)

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { keywords: true },
    })

    if (!question) {
        return res.status(404).json({ message: "Question not found" })
    }

    await prisma.question.delete({ where: { id: questionId }})

    res.json({
        message: "Question deleted succesfully",
        question: formatQuestion(question),
    })
})

router.post("/:questionId/play", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { answer } = req.body;          

    if (!answer) {
        return res.status(400).json({ message: "answer is required" });
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    const correct = answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    const attempt = await prisma.attempt.create({
        data: {
            userId: req.user.userId,
            questionId,
            submittedAnswer: answer,
            correct,
        },
    });

    res.status(201).json({
        id: attempt.id,
        correct,
        submittedAnswer: attempt.submittedAnswer,
        correctAnswer: question.answer,    
        createdAt: attempt.createdAt,
    });
});

module.exports = router