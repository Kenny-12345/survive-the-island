# Rules as implemented

These rules follow the official **Survive The Island** rulebook (Zygomatic, 2024) and the official **Survive The Island: Monster Pack** rulebook. Both are published as PDFs on the publisher's website. I also checked the older *Survive: Escape from Atlantis!* rulebook, which uses the same core design.

The engine is in `shared/game.ts`. Each rule in the code carries a tag:
- `[OFFICIAL]`: taken from the rulebook.
- `[ASSUMED]`: the rulebook doesn't say, or only shows it in a picture. This is my best reading; check it against a physical copy.
- `[DIGITAL]`: a change needed for online play.
- `[HOUSE]`: an optional custom rule, Custom mode only.

## Base game — official
| Rule | Implementation |
|---|---|
| Components | 40 island tiles (16 beach, 16 forest, 8 mountain), 10 adventurers per colour, 12 rafts, 5 sea serpents, 6 sharks, 2 Kaijus, a creature die |
| Setup | Tiles are shuffled and placed face up at random. Serpents start on the serpent spaces. Players take turns placing one adventurer at a time on an empty tile, choosing its treasure value secretly. Then each player places 2 rafts on empty water spaces next to the island. |
| 2 players | Each player plays two colours: 20 adventurers and 4 rafts |
| 5 players | Once all 40 tiles are occupied, the remaining adventurers go on tiles that hold exactly one meeple |
| Turn | 1. **Action**: up to 3 one-space moves, plus any number of ability tiles. 2. **Rising Waters**: remove one tile. 3. **Creatures**: roll the die and move a creature. |
| On foot | From an island tile, raft or Rescue Island to an adjacent island tile, raft or Rescue Island. Any number of adventurers may share a space. |
| Swimming | Any move that starts or ends on a water space. Each adventurer may swim only once per turn (ability tiles excepted). Swimmers may climb back onto land. An adventurer on the same space as a raft with room boards it immediately. |
| Rafts | Move an empty raft, or one where you have at least as many adventurers aboard as each opponent, to an adjacent water space with no raft. A raft holds 3. |
| Rising Waters | Remove any tile of the thinnest type left (all beaches, then forests, then mountains). Pieces on it move onto the new water space. If you have no adventurers left to rescue, remove 2 tiles instead. |
| Effect tiles (applied at once) | Green creature (shark) ×6: 3 beach + 3 forest. Blue creature (Kaiju) ×5: 3 beach + 2 forest. Raft ×4: 1 beach + 3 forest. Whirlpool ×6: 2 forest + 4 mountain. Volcano ×4: all mountain. |
| Ability tiles (kept secretly) | Paddles ×2: beach. Dolphin ×4: 3 beach + 1 forest. Dive ×2: forest. Creature die ×4: 2 beach + 2 forest. Repellent ×3: 2 beach + 1 forest. |
| Creature tile | Place that creature on the space. If all of them are already on the board, move one there instead. |
| Raft tile | Place a raft from the supply. If the supply is empty, move an empty raft there; if there is none, nothing happens. Swimmers there climb aboard. |
| Whirlpool | Removes every adventurer, creature and raft on its space and on the adjacent water spaces |
| Volcano | Removes the adventurers and creatures on its space. The tile stays face up and nothing can enter it. **The 3rd volcano ends the game.** |
| Abilities | **Paddles**: move an empty or controlled raft 1–2 spaces. **Dolphin**: move one of your swimmers 1–2 water spaces; it may end on land or a raft. **Dive**: move any creature to any empty water space. **Creature die**: roll and move a creature (you still roll in the Creatures phase). **Repellent**: remove a shark or Kaiju sharing a space with your adventurer; it can be played on other players' turns. |
| Creature die | You **must** move a creature of the rolled colour if one is on the board |
| Sea serpent (red) | Moves 1 water space. Eliminates rafts and every adventurer on its space. |
| Shark (green) | Moves 1–2 water spaces. Eliminates swimmers. |
| Kaiju (blue) | Moves 1–2 water or land spaces. Eliminates rafts, pushes adventurers onto adjacent spaces, and displaces creatures by their own movement rules. Nothing can enter a Kaiju's space except another Kaiju, which displaces the first. |
| Interactions | Triggered when a creature moves onto a space, when pieces are moved onto a creature's space, or when a creature is placed by a tile. A creature stops as soon as it enters a space holding something it interacts with. |
| End | No adventurers are left to rescue, or the 3rd volcano is revealed. Adventurers not yet rescued score 0. Highest treasure total wins, and **ties share the victory**. |

## Monster Pack — official
| Rule | Implementation |
|---|---|
| Choosing creatures | Pick at least one creature type per colour: red (serpent, kraken), green (shark, pterodactyl), blue (Kaiju, whale) |
| Piece counts | Serpent 5 (3 if both reds are used), kraken 4 (2), shark 6 (3), pterodactyl 3 (2), Kaiju 2 (2), whale 5 (3) |
| Red setup | Serpents only: the 5 serpent spaces. Krakens only: the 4 corner spaces. Both: a serpent in the middle and the others in the 4 corners. |
| Two types of one colour | A creature tile lets you choose which type enters. The die lets you move either type. |
| Whale | Moves 1–3 water spaces. Eliminates rafts. |
| Pterodactyl | Flies in a straight line in any of the 6 directions, any distance, over anything. It stops on a water or land space holding at most one adventurer (never a volcano or Kaiju space) and eliminates all adventurers there. |
| Kraken | Moves 1 water space and eliminates swimmers. Then it **must** eliminate one adventurer on its space or an adjacent one, even one of yours. |
| Piranhas (optional) | The red Piranha tile replaces a beach "creature die" tile. When revealed, it eliminates everything on its space, stays face up as a deadly water space, and the 5 green Piranha ability tiles are dealt round the table starting with you. A Piranha ability places another piranha tile next to an existing one. Anything placed on or moved onto a piranha tile is eliminated. Whirlpools don't remove piranha tiles. |
| Eggs (optional) | Two Egg tiles replace one beach green-creature tile and one beach blue-creature tile. When revealed, you place an egg on any water space. At the start of your next turn it hatches: roll the die and bring a creature of that colour there, or move one there if none are left in the reserve. Whirlpools, volcanoes and piranhas destroy eggs. |

## Assumed: the rulebook doesn't state these, so check against a physical copy
- **Treasure split:** each colour has two adventurers of each value 1–5 (sum 30). The rulebook only says values run from 1 to 5.
- **Creature die:** two faces each of red, green and blue.
- **Board:** the island outline is rings 1–3 around a central water hole, plus 4 extra hexes. The sea is a 13 × 11 hex rectangle. The four corner serpent spaces sit two hexes in from each Rescue Island. The printed board has its own fixed outline.
- **Whale and swimmers:** when a whale smashes a raft and a shark or serpent is in the same space, the new swimmers are attacked at once. The older Atlantis rules state this explicitly.
- **Placing a piranha:** a piranha ability tile placed on a space with pieces eliminates them.

## Digital adaptations
- **Repellent is played automatically.** When a shark or Kaiju would hit your adventurer and you hold one, it fires, checking players in turn order from the active player. That avoids pausing the game to ask someone who isn't taking a turn.
- **Kaiju pushes:** the server chooses each pushed adventurer's landing space and each displaced creature's new space at random among legal ones. The rulebook lets the active player choose.
- **Raft boarding order:** when several swimmers could board, the active player's adventurers go first.
- **Seeing your own values:** you can always see your own treasure values. In the physical game you must memorise them after setup.
- **No winner on zero:** if nobody rescued any treasure, nobody wins.

## House rules (Custom mode only, not official)
- **Strong swimmers:** each adventurer may swim twice per turn.
- **Extra raft:** each player places one more raft.
- **Sudden eruption:** the first volcano ends the game, as in the classic Escape from Atlantis.

## Cosmetic only
The playable characters (Gojirex, Megafin…) are avatars and don't change the rules. Weather is visual only.
