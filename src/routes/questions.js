const express = require("express")
const router = express.Router()

const questions = require("../data/questions")

router.get("/", (req, res) => {

    const {keyword} = req.query

    if (!keyword) {
        return res.json(questions)
    }

    const filteredQuestions = questions.filter(q => q.keywords.includes(keyword.toLowerCase()))

    res.json(filteredQuestions)
})

router.get("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId)
    const question = questions.find(q => q.id === questionId)

    if (!question) {
        return res.status(404).json({message: "Post not found"})
    }

    res.json(question)
})

router.post("/", (req, res) => {
    const {question, answer, keywords} = req.body

    if (!question || !answer) {
        return res.status(400).json({msg: "question and answer are mandatory"})
    }

    const existingIds = questions.map(q => q.id)
    const maxId = Math.max(...existingIds)

    const newQuestion = {
        id : questions.length ? maxId + 1 : 1,
        question,
        answer,
        keywords: Array.isArray(keywords) ? keywords : []
    }
    questions.push(newQuestion)
    res.status(201).json(newQuestion)
})

router.put("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId)
    const {question, answer, keywords} = req.body

    const q = questions.find(q => q.id === questionId)

    if (!q) {
        return res.status(404).json({msg: "Question not found"})
    }

    if (!question || !answer) {
        return res.json({msg: "question and answer required"})
    }

    q.question = question
    q.answer = answer
    q.keywords = Array.isArray(keywords) ? keywords: []

    res.json(q)
})

router.delete("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId)

    const questionIndex = questions.findIndex(q => q.id === questionId)

    if (questionIndex === -1) {
        return res.status(404).json({msg: "Question not found"})
    }

    const deletedQuestion = questions.splice(questionIndex, 1)

    res.json({
        message: "Question deleted succesfully",
        question: deletedQuestion[0]
    })
})

module.exports = router