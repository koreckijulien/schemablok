# Schemablok

Schemablok est une application web installable sur Android depuis Google Chrome.

## Installation sur Android

Le site doit être publié en HTTPS (GitHub Pages fournit le HTTPS). Ouvrez ensuite
son adresse dans Chrome sur Android, puis choisissez **Installer l’application**
ou **Ajouter à l’écran d’accueil** dans le menu ⋮.

Le manifeste web décrit l’application et ses icônes. Le service worker met en
cache la page et ses ressources pour permettre de la rouvrir hors ligne après
une première visite. Après une mise à jour publiée, rechargez la page pour
récupérer la nouvelle version.

## Signaux vectoriels et calcul matriciel

- **Multiplexeur** regroupe ses entrées scalaires dans un vecteur, de haut en
  bas. **Démultiplexeur** sépare un vecteur en sorties scalaires dans le même
  ordre ; le nombre de sorties doit correspondre à la longueur du vecteur.
- Une **Constante** peut fournir un vecteur, par exemple `[1 2 3]`, ou le nom
  d'un vecteur défini dans les variables du modèle.
- Un **Oscilloscope** accepte directement un vecteur : ses composantes sont
  tracées et exportées séparément. Les couleurs sont réutilisées au-delà des
  huit premières séries.
- Les autres blocs restent scalaires, à l'exception d'**Expression** en mode
  vectoriel. Pour les utiliser avec un vecteur, insérez un démultiplexeur.

Dans **Expression**, choisissez le mode **vectoriel** pour accepter des
vecteurs en entrée et produire un scalaire ou un vecteur. Les entrées sont
`u1`, `u2`, etc. (`u` est un alias de `u1`). L'accès `u1[1]` désigne la
première composante : l'indexation commence à 1. Les vecteurs littéraux
s'écrivent `[a,b,c]`, et les matrices `[a,b;c,d]` : les virgules séparent les
colonnes et les points-virgules les lignes. Les coefficients peuvent dépendre
des entrées et du temps `t`. On peut additionner ou soustraire des vecteurs ou
matrices de mêmes dimensions, multiplier ou diviser par un scalaire, et
multiplier une matrice par un vecteur ou une autre matrice de dimensions
compatibles. Une sortie doit être un scalaire ou un vecteur, pas une matrice.
Un littéral à une seule ligne représente un vecteur colonne, pas une matrice
ligne. Les fonctions mathématiques et les comparaisons restent scalaires.

### Exemple : transformation de Park

L'exemple intégré **Transformation de Park** regroupe les trois phases,
applique une matrice dépendant d'un angle électrique dynamique, puis sépare
les composantes. Dans le bloc Expression, `u1` est `[a,b,c]` et `u2` est
l'angle en radians :

```text
(2/3)*[cos(u2),cos(u2-2*pi/3),cos(u2+2*pi/3);
       -sin(u2),-sin(u2-2*pi/3),-sin(u2+2*pi/3);
       1/2,1/2,1/2]*u1
```

Cette convention utilise l'axe direct en cosinus, l'axe en quadrature en
sinus négatif et une normalisation conservant l'amplitude. Les sorties sont
dans l'ordre `d`, `q`, `0`. Selon la convention de votre système, les signes
ou le facteur de normalisation peuvent être modifiés dans l'expression.

## Tests

Avec Node.js installé, exécutez `node --test tests/vector.test.js` pour vérifier
les exemples scalaires, les signaux vectoriels et la transformation de Park.