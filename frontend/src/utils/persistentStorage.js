export async function enablePersistence() {
    if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
    }
}
