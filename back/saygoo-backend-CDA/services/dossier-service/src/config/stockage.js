const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Les fichiers sont écrits hors de `src/` pour ne pas être emportés par un
// rebuild, et hors du dossier servi publiquement : rien n'est accessible
// sans passer par l'endpoint de téléchargement authentifié.
const DOSSIER_STOCKAGE = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(DOSSIER_STOCKAGE)) {
  fs.mkdirSync(DOSSIER_STOCKAGE, { recursive: true });
}

const TAILLE_MAX_OCTETS = parseInt(process.env.UPLOAD_MAX_MO || '10', 10) * 1024 * 1024;

// Types réellement acceptés. On contrôle l'extension ET le type MIME déclaré :
// se fier au seul nom de fichier laisserait passer un exécutable renommé.
const TYPES_AUTORISES = {
  '.pdf': ['application/pdf'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

const stockage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOSSIER_STOCKAGE),
  filename: (req, file, cb) => {
    // Le nom d'origine n'est jamais utilisé comme nom de fichier : il pourrait
    // contenir « ../ » et faire écrire ailleurs sur le disque. On génère un
    // identifiant aléatoire et on ne conserve que l'extension validée.
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const filtrerFichier = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const typesAttendus = TYPES_AUTORISES[extension];

  if (!typesAttendus) {
    return cb(new Error(`Format non accepté (${extension || 'sans extension'}). Formats autorisés : PDF, JPG, PNG, DOC, DOCX.`));
  }
  if (!typesAttendus.includes(file.mimetype)) {
    return cb(new Error(`Le contenu du fichier ne correspond pas à son extension (${extension}).`));
  }

  cb(null, true);
};

const upload = multer({
  storage: stockage,
  limits: { fileSize: TAILLE_MAX_OCTETS, files: 1 },
  fileFilter: filtrerFichier,
});

// Reconstruit un chemin absolu sûr à partir d'un nom de fichier stocké.
// `basename` retire déjà toute composante de répertoire : « ../../etc/passwd »
// devient « passwd ». La comparaison qui suit est une seconde barrière, et
// inclut le séparateur pour ne pas confondre « /uploads » avec « /uploads-bis ».
const cheminSecurise = (nomFichier) => {
  if (!nomFichier) return null;

  const chemin = path.resolve(DOSSIER_STOCKAGE, path.basename(String(nomFichier)));
  return chemin.startsWith(DOSSIER_STOCKAGE + path.sep) ? chemin : null;
};

const supprimerFichier = (nomFichier) => {
  const chemin = cheminSecurise(nomFichier);
  if (chemin && fs.existsSync(chemin)) {
    fs.unlinkSync(chemin);
  }
};

module.exports = {
  upload,
  DOSSIER_STOCKAGE,
  TAILLE_MAX_OCTETS,
  TYPES_AUTORISES,
  cheminSecurise,
  supprimerFichier,
};
