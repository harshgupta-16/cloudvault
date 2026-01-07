export default function PWAUpdateBanner({ onRefresh }) {
    return (
        <>
            <div className="cv-pwa-update">
                <span className="cv-pwa-text">
                    ✨ New update available
                </span>
                <button
                    className="cv-pwa-btn"
                    onClick={onRefresh}
                >
                    Update
                </button>
            </div>

            {/* Component-scoped CSS */}
            <style>{`
        .cv-pwa-update {
          position: fixed;
          bottom: 90px; /* above FAB */
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;

          display: flex;
          align-items: center;
          gap: 14px;

          padding: 14px 18px;
          border-radius: 16px;

          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.25),
            rgba(139, 92, 246, 0.25)
          );

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);

          border: 1px solid rgba(99, 102, 241, 0.25);

          box-shadow:
            0 0 30px rgba(99, 102, 241, 0.35),
            0 10px 35px rgba(0, 0, 0, 0.35);

          animation: cvPwaSlideUp 0.35s ease;
        }

        .cv-pwa-text {
          font-size: 14px;
          font-weight: 500;
          color: #eef2ff;
          white-space: nowrap;
        }

        .cv-pwa-btn {
          border: none;
          cursor: pointer;

          padding: 8px 14px;
          border-radius: 12px;

          font-size: 13px;
          font-weight: 600;

          color: #020617;
          background: linear-gradient(
            135deg,
            #6366f1,
            #8b5cf6,
            #22d3ee
          );

          box-shadow:
            0 0 18px rgba(99, 102, 241, 0.6);

          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .cv-pwa-btn:hover {
          transform: translateY(-1px);
          box-shadow:
            0 0 25px rgba(139, 92, 246, 0.8);
        }

        @keyframes cvPwaSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        /* Dark mode tweak (works with your .dark class) */
        .dark .cv-pwa-update {
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.35),
            rgba(30, 41, 59, 0.55)
          );
          border-color: rgba(99, 102, 241, 0.35);
        }

        /* Mobile fine-tuning */
        @media (max-width: 640px) {
          .cv-pwa-update {
            bottom: 80px;
            padding: 12px 14px;
            gap: 12px;
          }

          .cv-pwa-text {
            font-size: 13px;
          }
        }
      `}</style>
        </>
    );
}
