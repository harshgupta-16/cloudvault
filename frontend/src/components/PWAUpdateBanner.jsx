export default function PWAUpdateBanner({ onRefresh }) {
    return (
        <div className="pwa-update-banner">
            <div className="pwa-update-content">
                <span className="pwa-update-text">
                    ✨ New version available
                </span>
                <button
                    className="pwa-update-btn"
                    onClick={onRefresh}
                >
                    Update
                </button>
            </div>
        </div>
    );
}
