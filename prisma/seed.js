const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
        "id": 1,
        "question": "What is the capital of Finland?",
        "answer": "Helsinki",
        "keywords": ["capital", "finland"]
    },
    {
        "id": 2,
        "question": "Do cheetahs meow?",
        "answer": "Yes",
        "keywords": ["cheetah", "meow"]
    },
    {
        "id": 3,
        "question": "What is the square root of 49?",
        "answer": "7",
        "keywords": ["square root"]
    },
    {
        "id": 4,
        "question": "What country has the most people?",
        "answer": "China",
        "keywords": ["most people", "country"]
    }
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
