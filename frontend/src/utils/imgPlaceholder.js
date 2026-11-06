// Placeholder de imagem LOCAL (data URI SVG). Não faz requisição de rede,
// então nunca falha nem entra em loop — resolve o piscar dos produtos sem foto.
// Vai em: src/utils/imgPlaceholder.js

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#f3ece9"/>
  <rect x="102" y="120" width="96" height="72" rx="8" fill="none" stroke="#c9a8a0" stroke-width="4"/>
  <circle cx="128" cy="144" r="9" fill="#c9a8a0"/>
  <path d="M106 188l26-26 18 18 16-14 30 30" fill="none" stroke="#c9a8a0" stroke-width="4" stroke-linejoin="round"/>
  <text x="150" y="224" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#b08d84" text-anchor="middle">Sem imagem</text>
</svg>`;

export const IMG_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(svg)}`;

// Handler de erro reutilizável: troca para o placeholder local UMA vez.
// Zera o onerror pra nunca repetir (o data URI não falha, mas é uma garantia extra).
export const onImgError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = IMG_PLACEHOLDER;
};