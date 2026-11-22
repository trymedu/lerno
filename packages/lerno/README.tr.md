# Lerno

**Eğitim içerikleri için framework bağımsız motor.** Deklaratif içerik tipleri, deterministik bir
oturum çalışma zamanı, değerlendirme katmanı ve K-12 STEM çekirdekleri — framework'ten ve
renderer'dan bağımsız.

[![npm](https://img.shields.io/npm/v/@medu/lerno?color=blue)](https://www.npmjs.com/package/@medu/lerno)
[![license](https://img.shields.io/npm/l/@medu/lerno)](./LICENSE)

> English: [README.md](./README.md)

Lerno uygulama yığınınızı bilmez: veritabanı, gerçek zamanlı taşıma, nesne depolama, xAPI veya LLM
yoktur. Bunların hepsi dışarıdan `LernoHost` adaptörleri ve `LernoExtension` paketleriyle gelir; böylece
çekirdek küçük ve test edilebilir kalır.

---

## Katmanlar

| Katman | İçerik |
| --- | --- |
| **İçerik modeli** | `LernoDocument` + zod şemaları (`slide`, `question`, `media`, `branch`, `info`, `cards`, `hotspot`, `custom`) |
| **Runtime** | `createSession` — akış, cevaplama, puanlama, ilerleme; `Timeline` |
| **Değerlendirme** | `defineQuestion` + yerleşik grader'lar, kavram yanılgısı etiketleri |
| **Uzantı sistemi** | `LernoRegistry` (node, soru, akış, bileşen) + `LernoHost` adaptörleri |
| **Disiplin çekirdekleri** | `FunctionPlotter` (`function-graph`), `ProjectileSimulation`, `Molecule2D`, `CoordinatePlane`, `CalculusEngine` |
| **Alt seviye motor** | sahne grafiği (`scenery`), gözlemlenebilirler (`axon`), geometri (`kite`, `dot`), animasyon (`twixt`), simülasyon döngüsü (`sim`) |

---

## Kurulum

```bash
bun add @medu/lerno zod
```

Tek çalışma zamanı bağımlılığı `zod`'dur. Node 20 veya üzeri.

## Hızlı başlangıç

```ts
import { createSession, defineDocument } from '@medu/lerno';

const document = defineDocument({
  id: 'ders-1',
  type: 'lesson',
  metadata: { title: 'Karesel Fonksiyonlar' },
  nodes: [
    { id: 's1', type: 'slide', blocks: [{ type: 'text', markdown: 'Merhaba' }] },
    {
      id: 'q1',
      type: 'question',
      item: {
        kind: 'multiple-choice',
        prompt: 'f(x) = x² için f(2) kaçtır?',
        choices: [
          { id: 'a', label: '2' },
          { id: 'b', label: '4' },
        ],
        correct: ['b'],
      },
    },
  ],
});

const session = createSession(document);
session.next(); // 'q1'
session.answer('q1', { selected: ['b'] }); // { status: 'correct', score: 1, maxScore: 1 }
session.score(); // { earned: 1, max: 1, ratio: 1, passed: null }
```

`session.getState()` düz ve serileştirilebilir bir anlık görüntü döner; kaldığı yerden devam etmek
için `createSession(document, { state })` ile geri verin.

## Giriş noktaları

| Import | Getirdiği |
| --- | --- |
| `@medu/lerno` | Aşağıdakilerin tamamı |
| `@medu/lerno/core` | Sahne grafiği, gözlemlenebilirler, geometri, animasyon, sim döngüsü — zod ve içerik şeması yok |
| `@medu/lerno/session` | `createSession` ve oturum durumu sözleşmesi |
| `@medu/lerno/content` | Doküman şeması, hazır reçeteler, migrasyonlar |
| `@medu/lerno/grading` | Soru tanımları ve grader'lar |
| `@medu/lerno/extensions` | `LernoRegistry`, `LernoHost`, `createLerno` |

Yalnızca çizen ve canlandıran bir yüzey için `core`; doküman yükleyip cevap puanlayan bir yüzey için
paket kökü.

## Uzantılar

```ts
import { createLerno, defineExtension } from '@medu/lerno';

const extension = defineExtension({
  name: 'my-extension',
  setup(registry) {
    registry.addNode({ type: 'flashcard', label: 'Kart' });
    registry.addComponent({ type: 'ui.switch', version: 1 });
    registry.addFlow('always-first', (document) => document.nodes[0]?.id ?? null);
  },
});

const { registry, host } = createLerno({ extensions: [extension] });
```

Çekirdek yalnızca registry'ye kaydedilmiş tipleri tanır; yeni node, soru ve akış tipleri çekirdeği
değiştirmek yerine ayrı paketler olarak gelir.

## Determinizm

Bir koşuyu tekrarlanabilir yapan iki host adaptörü vardır: `host.clock()` ve `host.random()`.
Kendi üreticilerinizi verdiğinizde aynı doküman aynı duruma çıkar; kayıt, tekrar oynatma ve headless
render bunun üzerine kuruludur.

```ts
const { host } = createLerno({
  host: { clock: () => frameIndex * 16.6, random: () => 0.5 },
});
```

## Geliştirme

```bash
bun install
bun run test        # 28 suite, 159 test
bun run type-check  # strict, any yok
bun run build       # CJS + ESM + declaration, dist/ içine
```

## Yol haritası

Bugün yayında olan tek paket `@medu/lerno`. React oynatıcı, Three renderer, hareket reçeteleri,
dışa aktarma adaptörleri ve xAPI/mastery eklentileri aynı monorepo'nun ayrı paketleridir ve henüz
npm'de değildir.

## Lisans

[MIT](./LICENSE) © Lerno contributors
