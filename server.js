require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ================================
// Временное хранилище кодов
// ================================

const verificationCodes = new Map();


// ================================
// Генерация XXX-XXX
// ================================

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    function generatePart() {
        let result = "";

        for (let i = 0; i < 3; i++) {
            result += chars[crypto.randomInt(0, chars.length)];
        }

        return result;
    }

    return `${generatePart()}-${generatePart()}`;
}


// ================================
// Проверка email
// ================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// ================================
// ОТПРАВКА КОДА
// ================================

app.post("/api/auth/send-code", async (req, res) => {

    try {

        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();


        if (!isValidEmail(email)) {

            return res.status(400).json({
                success: false,
                message: "Введите правильный email."
            });

        }


        // Генерируем код

        const code = generateCode();


        // Сохраняем на 5 минут

        verificationCodes.set(email, {

            code: code,

            expires: Date.now() + 5 * 60 * 1000,

            attempts: 0,

            sentAt: Date.now()

        });


        // Отправляем письмо через Resend

        const response = await fetch(
            "https://api.resend.com/emails",
            {

                method: "POST",

                headers: {

                    "Authorization":
                        `Bearer ${process.env.RESEND_API_KEY}`,

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    from:
                        "Iyose <onboarding@resend.dev>",

                    to: [
                        email
                    ],

                    subject:
                        "Код входа в Iyose",

                    html: `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width">

</head>

<body style="
    margin:0;
    padding:0;
    background:#08080b;
    font-family:Arial,sans-serif;
">

<div style="
    max-width:500px;
    margin:40px auto;
    padding:35px;
    background:#121216;
    border-radius:24px;
    color:white;
">

    <h1 style="
        margin:0 0 10px;
        font-size:32px;
    ">
        Iyose
    </h1>

    <p style="
        color:#a1a1aa;
        font-size:16px;
    ">
        Код подтверждения для входа:
    </p>


    <div style="
        margin:30px 0;
        padding:22px;
        background:#1c1c22;
        border-radius:16px;
        text-align:center;
        font-size:32px;
        font-weight:bold;
        letter-spacing:7px;
    ">

        ${code}

    </div>


    <p style="
        color:#a1a1aa;
        font-size:14px;
    ">
        Код действует 5 минут.
    </p>


    <p style="
        color:#71717a;
        font-size:12px;
    ">
        Если вы не запрашивали вход в Iyose,
        просто проигнорируйте это письмо.
    </p>

</div>

</body>

</html>

                    `

                })

            }
        );


        const data = await response.json();


        if (!response.ok) {

            console.error(
                "Resend error:",
                data
            );


            // Если письмо не отправилось,
            // удаляем сохранённый код

            verificationCodes.delete(email);


            return res.status(500).json({

                success: false,

                message:
                    "Не удалось отправить письмо."

            });

        }


        console.log(
            `Код отправлен на ${email}`
        );


        res.json({

            success: true,

            message:
                "Код отправлен на вашу почту."

        });


    } catch (error) {

        console.error(
            "SEND CODE ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Ошибка сервера."

        });

    }

});


// ================================
// ПРОВЕРКА КОДА
// ================================

app.post("/api/auth/verify-code", (req, res) => {

    try {

        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();


        const code = String(req.body.code || "")
            .trim()
            .toUpperCase();


        const saved =
            verificationCodes.get(email);


        // Код отсутствует

        if (!saved) {

            return res.status(400).json({

                success: false,

                message:
                    "Код не найден или уже использован."

            });

        }


        // Проверяем срок действия

        if (Date.now() > saved.expires) {

            verificationCodes.delete(email);


            return res.status(400).json({

                success: false,

                message:
                    "Срок действия кода истёк."

            });

        }


        // Ограничение попыток

        if (saved.attempts >= 5) {

            verificationCodes.delete(email);


            return res.status(429).json({

                success: false,

                message:
                    "Слишком много попыток."

            });

        }


        // Проверяем код

        if (code !== saved.code) {

            saved.attempts++;


            return res.status(400).json({

                success: false,

                message:
                    "Неверный код."

            });

        }


        // Всё правильно

        verificationCodes.delete(email);


        console.log(
            `Email подтверждён: ${email}`
        );


        res.json({

            success: true,

            message:
                "Email успешно подтверждён!",

            email:
                email

        });


    } catch (error) {

        console.error(
            "VERIFY ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Ошибка сервера."

        });

    }

});


// ================================
// Проверка работы сервера
// ================================

app.get("/api/health", (req, res) => {

    res.json({

        success: true,

        message:
            "Iyose server работает!"

    });

});


// ================================
// Запуск
// ================================

app.listen(PORT, () => {

    console.log("");
    console.log("==============================");
    console.log("       IYOSE SERVER");
    console.log("==============================");
    console.log(
        `Server started on port ${PORT}`
    );
    console.log("");

});
