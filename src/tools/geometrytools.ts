export function niceCoordinates(coords: number[], locale: string) {
    const east = (Math.round(coords[0] * 100) / 100).toLocaleString(locale, {minimumFractionDigits: 2});
    const nord = (Math.round(coords[1] * 100) / 100).toLocaleString(locale, {minimumFractionDigits: 2});
    return [east, nord]
}