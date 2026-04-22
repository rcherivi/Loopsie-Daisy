
import re
import math
from collections import defaultdict

try:
    import nltk
    from nltk.stem import PorterStemmer
    from nltk.stem import WordNetLemmatizer
    from nltk.corpus import wordnet
    from nltk import pos_tag, word_tokenize

    for pkg in ("wordnet", "averaged_perceptron_tagger", "punkt", "omw-1.4", "punkt_tab"):
        try:
            nltk.download(pkg, quiet=True)
        except Exception:
            pass

    _stemmer = PorterStemmer()
    _lemmatizer = WordNetLemmatizer()
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

def _tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    return text.split()


def _get_wordnet_pos(treebank_tag: str) -> str:
    """Map Penn Treebank POS tag → WordNet POS constant."""
    if treebank_tag.startswith("J"):
        return wordnet.ADJ
    elif treebank_tag.startswith("V"):
        return wordnet.VERB
    elif treebank_tag.startswith("R"):
        return wordnet.ADV
    else:
        return wordnet.NOUN


def stem_word(word: str) -> str:
    if NLTK_AVAILABLE:
        return _stemmer.stem(word)
    for suffix in ("ing", "tion", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def lemmatize_tokens(tokens: list[str]) -> list[str]:
    """Return lemmatized tokens, using POS context when available."""
    if not NLTK_AVAILABLE:
        return tokens
    try:
        tagged = pos_tag(tokens)
        return [
            _lemmatizer.lemmatize(word, _get_wordnet_pos(tag))
            for word, tag in tagged
        ]
    except Exception:
        return [_lemmatizer.lemmatize(w) for w in tokens]


def edit_distance(a: str, b: str) -> int:
    if a == b:
        return 0
    la, lb = len(a), len(b)
    if la == 0:
        return lb
    if lb == 0:
        return la

    prev = list(range(lb + 1))
    for i, ca in enumerate(a, 1):
        curr = [i] + [0] * lb
        for j, cb in enumerate(b, 1):
            curr[j] = min(
                prev[j] + 1,       
                curr[j - 1] + 1,   
                prev[j - 1] + (0 if ca == cb else 1), 
            )
        prev = curr
    return prev[lb]


def _edit_distance_score(a: str, b: str) -> float:
    """Normalised similarity in [0, 1]; 1.0 = identical."""
    d = edit_distance(a, b)
    return 1.0 - d / max(len(a), len(b), 1)


_vocab_stems: dict[str, set] = defaultdict(set)
_vocab_words: set = set()


def build_fuzzy_vocab(patterns) -> None:
    global _vocab_stems, _vocab_words
    _vocab_stems = defaultdict(set)
    _vocab_words = set()

    for p in patterns:
        for field in (p.title, p.description):
            if not field:
                continue
            for word in _tokenize(field):
                if len(word) >= 3:
                    _vocab_words.add(word)
                    _vocab_stems[stem_word(word)].add(word)

_MAX_EDIT = 2
_MIN_LEN_FOR_CORRECTION = 4


def _best_correction(word: str) -> str | None:
    if word in _vocab_words or len(word) < _MIN_LEN_FOR_CORRECTION:
        return None

    stem = stem_word(word)
    candidates = list(_vocab_stems.get(stem, set()))

    for vs, words in _vocab_stems.items():
        if edit_distance(stem, vs) <= 1:
            candidates.extend(words)

    if not candidates:
        candidates = list(_vocab_words)

    best_word, best_score = None, -1.0
    for cand in candidates:
        if abs(len(cand) - len(word)) > _MAX_EDIT:
            continue
        d = edit_distance(word, cand)
        if d <= _MAX_EDIT:
            score = _edit_distance_score(word, cand)
            if score > best_score:
                best_score = score
                best_word = cand

    return best_word if best_score >= (1.0 - _MAX_EDIT / max(len(word), 1)) else None



def normalize_query(query: str) -> tuple[str, str]:
    tokens = _tokenize(query)

    lemmatized = lemmatize_tokens(tokens)

    corrected_tokens = []
    for word in lemmatized:
        correction = _best_correction(word)
        corrected_tokens.append(correction if correction else word)

    corrected_query = " ".join(corrected_tokens)

    stemmed_query = " ".join(stem_word(w) for w in corrected_tokens)

    return corrected_query, stemmed_query


def fuzzy_title_score(query_tokens: list[str], title: str) -> float:
    title_tokens = _tokenize(title)
    if not query_tokens or not title_tokens:
        return 0.0

    total = 0.0
    for qt in query_tokens:
        best = max(
            (_edit_distance_score(qt, tt) for tt in title_tokens),
            default=0.0,
        )
        total += best if best > 0.6 else 0.0

    return total / len(query_tokens)