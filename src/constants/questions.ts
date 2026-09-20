import { QuizQuestion } from '../types';

const questions: QuizQuestion[] = [
  {
    "id": "sql_1",
    "question": "query = \"SELECT * FROM users WHERE name = '\" + user_input + \"'\"\n# Objetivo: Bypassear autenticación sin contraseña.",
    "options": [
      "admin",
      "admin' OR '1'='1",
      "DROP TABLE users"
    ],
    "correctIndex": 1,
    "hint": "En SQL, la comilla simple (') cierra un texto. La condición 'OR' significa 'O'. Si escribes algo que siempre es verdad (como 1 es igual a 1), la base de datos te dejará pasar sin importar la contraseña."
  },
  {
    "id": "sql_2",
    "question": "cursor.execute(\"SELECT * FROM items WHERE id = %s\", (item_id,))\n# ¿Es este código vulnerable a SQL Injection?",
    "options": [
      "Sí, totalmente.",
      "No, usa parámetros parametrizados.",
      "Solo si item_id es texto."
    ],
    "correctIndex": 1,
    "hint": "Fíjate que el código no está 'pegando' el texto directamente con un (+). Usa marcadores especiales (%s) que separan los datos del código. Esto es la forma correcta de protegerse."
  },
  {
    "id": "py_1",
    "question": "eval(user_input)\n# ¿Por qué es peligrosa esta función en Python?",
    "options": [
      "Es muy lenta.",
      "Ejecuta código arbitrario del sistema.",
      "No soporta strings vacíos."
    ],
    "correctIndex": 1,
    "hint": "La función eval() toma texto y lo ejecuta como si fuera código del programa. Si un hacker escribe comandos del sistema operativo ahí, la computadora los obedecerá."
  },
  {
    "id": "sql_3",
    "question": "# Entrada maliciosa para cerrar un string y comentar el resto:\nuser_input = ?",
    "options": [
      "admin; --",
      "admin' #",
      "admin //"
    ],
    "correctIndex": 1,
    "hint": "En muchos tipos de SQL, el símbolo '#' se usa para crear comentarios. Todo lo que se escriba después de un comentario es ignorado por la computadora, permitiendo saltarse chequeos de seguridad."
  },
  {
    "id": "xss_1",
    "question": "return render_template_string(user_input)\n# ¿Qué vulnerabilidad introduce esto en Flask?",
    "options": [
      "SQL Injection",
      "Server-Side Template Injection (SSTI)",
      "Buffer Overflow"
    ],
    "correctIndex": 1,
    "hint": "Estás renderizando texto del usuario directamente en una plantilla. Los motores de plantillas (como Jinja2) permiten ejecutar lógica. Esto se llama Inyección de Plantillas del Lado del Servidor."
  }
];

export default questions;