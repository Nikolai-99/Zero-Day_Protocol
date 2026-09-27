import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { gameApi } from '../../api/gameApi';
import { QuizQuestion } from '../../types';
import { audioSystem } from '../../utils/audioSystem';

interface HackingQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBossMode?: boolean;
  wave?: number;
  onBossSuccess?: () => void;
  onBossFail?: () => void;
}

export const HackingQuizModal: React.FC<HackingQuizModalProps> = ({ 
  isOpen, 
  onClose,
  isBossMode = false,
  wave = 1,
  onBossSuccess,
  onBossFail,
}) => {
  const { shieldStacks, setShieldStacks, addScore } = useGameStore();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(1);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnsweredCorrectly, setIsAnsweredCorrectly] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      gameApi.getQuestions().then((qList) => {
        setQuestions(qList);
        if (isBossMode && wave) {
          const bossQIndex = (Math.floor(wave / 5) - 1) % Math.max(1, qList.length);
          setCurrentIndex(bossQIndex >= 0 ? bossQIndex : 0);
        } else {
          setCurrentIndex(0);
        }
        setAttemptsUsed(1);
        setIsAnsweredCorrectly(false);
        setIsFailed(false);
        setFeedback({ type: null, message: '' });
      });
    }
  }, [isOpen, isBossMode, wave]);

  if (!isOpen) return null;

  const currentQ = questions[currentIndex];

  const handleSelectOption = async (optionIndex: number) => {
    if (!currentQ || isEvaluating || isAnsweredCorrectly || isFailed) return;

    setIsEvaluating(true);
    try {
      const correctIdx = currentQ.correctIndex ?? currentQ.correct_index ?? 0;
      const res = await gameApi.evaluateQuiz(
        optionIndex,
        correctIdx,
        attemptsUsed,
        shieldStacks
      );

      if (res && res.success) {
        setShieldStacks(res.new_shields);
        addScore(res.bonus_score);
        setIsAnsweredCorrectly(true);
        setFeedback({
          type: 'success',
          message: `INYECCIÓN EXITOSA: +${res.shields_gained} ESCUDO(S) // +${res.bonus_score} PUNTOS`,
        });
      } else {
        if (isBossMode) {
          setIsFailed(true);
          setFeedback({
            type: 'error',
            message: `ACCESO DENEGADO: Inyección errónea. Contramedida del Núcleo activada: la oleada ${wave} se reiniciará.`,
          });
        } else {
          setAttemptsUsed((prev) => prev + 1);
          setFeedback({
            type: 'error',
            message: 'ACCESO DENEGADO: Inyección errónea. Vector vulnerable aún activo. Reintenta (+1 escudo disponible).',
          });
        }
      }
    } catch (e) {
      console.error('Error al evaluar quiz:', e);
      setFeedback({
        type: 'error',
        message: 'ERROR DE CONEXIÓN CON EL SUBSISTEMA DE HACKEO.',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setAttemptsUsed(1);
      setIsAnsweredCorrectly(false);
      setFeedback({ type: null, message: '' });
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn pointer-events-auto">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-neutral-950 border border-green-500/60 shadow-[0_0_35px_rgba(34,197,94,0.25)] rounded p-6 font-mono text-green-400">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-green-500/40 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-ping" />
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest font-bold text-green-400">
                TERMINAL DE INYECCIÓN DE CÓDIGO // HACKING QUIZ
              </span>
              <span className="text-[10px] text-green-600 font-mono tracking-wider">
                {isBossMode 
                  ? `[MODO COMBATE // JEFE CIRCULAR OLEADA ${wave}]` 
                  : '[SIMULADOR DE EXPLOITS // TERMINAL DE ENTRENAMIENTO]'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (isBossMode && !isAnsweredCorrectly) {
                if (onBossFail) onBossFail();
                else onClose();
              } else {
                onClose();
              }
            }}
            className="text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-white px-2 py-0.5 transition-colors uppercase"
          >
            [CERRAR TERMINAL]
          </button>
        </div>

        {/* Banner Informativo (Solo en Menú Principal / Modo Simulación) */}
        {!isBossMode && (
          <div className="mb-4 p-3.5 bg-neutral-900/90 border border-green-500/40 rounded text-[11px] font-mono leading-relaxed space-y-2.5 shadow-inner">
            <p className="text-green-300 font-semibold flex items-start gap-2">
              <span className="inline-block w-2 h-2 mt-1 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
              <span>Esta sección sirve para probar la funcionalidad del Quiz de hacking, para que no sea requerido llegar a la oleada 5.</span>
            </p>
            <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-300 space-y-1.5">
              <div className="text-green-400 uppercase tracking-wider font-bold">
                Condiciones de activación durante el gameplay:
              </div>
              <ul className="list-disc list-inside space-y-1 text-neutral-300 pl-1">
                <li>
                  <strong className="text-yellow-400">Oleada:</strong> Exclusivo del modo <span className="text-white font-bold">HACKING</span>. Aparece de manera obligatoria cada 5 oleadas (Oleadas 5, 10, 15 y 20).
                </li>
                <li>
                  <strong className="text-cyan-400">Tipo de enemigo:</strong> Vinculado al enemigo especial circular (<span className="text-cyan-300 font-bold">CORE</span>). El enemigo triangular (<span className="text-purple-400 font-bold">TRIANGLE</span>) en ningún momento libera el quiz.
                </li>
                <li>
                  <strong className="text-red-400">Enemigos derrotados:</strong> El jefe circular cuenta con escudos invulnerables que solo se desactivan tras eliminar a todos los esbirros normales de la ronda. Al derrotar a todos los enemigos y destruir finalmente al jefe circular sin ningún enemigo presente en la arena, se despliega la terminal del Quiz.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 border border-green-950/60 bg-green-950/10 px-3 py-1.5 mb-4">
          <div>
            NODO:{' '}
            <span className="text-white font-bold">
              {currentIndex + 1} / {questions.length || 5}
            </span>
          </div>
          <div>
            ESCUDOS ACTUALES:{' '}
            <span className="text-cyan-400 font-bold">
              {shieldStacks} / 5 STACKS
            </span>
          </div>
          <div>
            INTENTOS USADOS:{' '}
            <span className="text-yellow-400 font-bold">{attemptsUsed}</span>
          </div>
        </div>

        {/* Code Vulnerability Prompt */}
        {currentQ ? (
          <div className="space-y-4">
            <div className="bg-black/90 border border-neutral-800 p-4 rounded text-xs text-neutral-300 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner font-mono">
              <span className="text-neutral-500">// Vector de inyección detectado:</span>
              <br />
              <span className="text-green-300 font-bold">{currentQ.question}</span>
            </div>

            {/* Answer Options */}
            <div className="space-y-2 pt-2">
              <p className="text-[11px] text-neutral-400 uppercase tracking-wider">
                Selecciona el exploit para inyectar en el nodo:
              </p>
              {currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  disabled={isEvaluating || isAnsweredCorrectly || isFailed}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-3 border text-xs font-mono transition-all flex items-start gap-3 rounded ${
                    isAnsweredCorrectly && idx === (currentQ.correctIndex ?? currentQ.correct_index)
                      ? 'border-green-400 bg-green-950/40 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-green-500/70 hover:bg-green-950/20 hover:text-green-300'
                  }`}
                >
                  <span className="text-green-500 font-bold">[{idx + 1}]</span>
                  <span className="flex-1">{option}</span>
                </button>
              ))}
            </div>

            {/* Feedback Banner */}
            {feedback.message && (
              <div
                className={`p-3 border text-xs tracking-wider font-bold rounded animate-fadeIn ${
                  feedback.type === 'success'
                    ? 'border-green-500/80 bg-green-950/50 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                    : 'border-red-500/80 bg-red-950/50 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                }`}
              >
                {feedback.message}
              </div>
            )}

            {/* Next / Close Actions */}
            {isBossMode ? (
              <div className="pt-2 flex justify-end gap-2">
                {isAnsweredCorrectly && (
                  <button
                    onClick={() => (onBossSuccess ? onBossSuccess() : onClose())}
                    className="px-5 py-2 border border-green-500 bg-green-500 text-black font-bold text-xs uppercase tracking-widest hover:bg-green-400 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  >
                    {wave >= 20 ? 'RECLAMAR VICTORIA >>' : `AVANZAR A LA OLEADA ${wave + 1} >>`}
                  </button>
                )}
                {isFailed && (
                  <button
                    onClick={() => (onBossFail ? onBossFail() : onClose())}
                    className="px-5 py-2 border border-red-500 bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-500 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                  >
                    REINICIAR OLEADA {wave} &gt;&gt;
                  </button>
                )}
              </div>
            ) : (
              isAnsweredCorrectly && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNext}
                    className="px-5 py-2 border border-green-500 bg-green-500 text-black font-bold text-xs uppercase tracking-widest hover:bg-green-400 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  >
                    {currentIndex < questions.length - 1
                      ? 'Siguiente Vector >>'
                      : 'Finalizar Inyección (Cerrar)'}
                  </button>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-400 text-xs">
            Cargando vectores de inyección desde la API...
          </div>
        )}
      </div>
    </div>
  );
};
