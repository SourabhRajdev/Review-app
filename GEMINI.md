# Current Migration Progress

This document tracks the ongoing migration of the legacy 'cafe-menu-magic' game flow into the 'reviewapp-premium' project.

## Completed Steps (as of last session)

- **Cloned Legacy Repository**: The 'cafe-menu-magic' repository has been cloned into `./legacy-repo` to serve as the source for migration.
- **Data Migration**: 'reviewapp-premium/src/data/legacyData.ts' was created to store shared data like nationalities, menu items, and product questions from the legacy application.
- **Step 1: Onboarding & Round 1 (Easy Mode)**:
    - `AboutYouScreen.tsx` (migrated from legacy `AboutYou.tsx`)
    - `OrderSelectionScreen.tsx` (migrated from legacy `OrderSelection.tsx`)
    - `ProductGameScreen.tsx` (migrated from legacy `ProductGame.tsx`, serves as Round 1)
- **Step 2: Optional Archery Game (Reward Only)**:
    - Existing `ArcheryScreen.tsx` was adapted to function as an optional, reward-only game. It now includes a "Skip Bonus" option and directly navigates to "Round 2" upon completion or skip.
- **Step 3: Round 2 (Service/Wait Game)**:
    - `Round2Screen.tsx` was created and migrated from legacy `ServiceGame.tsx`, focusing on the "How was the wait?" slider mechanic.
- **Step 4: Basketball Game (Reward Only)**:
    - Existing `BasketballScreen.tsx` was adapted to function purely as a reward-only game, removing its initial question-based phase. It now directly proceeds to the "game" phase and navigates to "VibeGame" (which will be Round 3 / Musical Tiles) upon completion.
- **Navigation Updates**:
    - `reviewapp-premium/src/screens/types.ts` was updated with new `ScreenId` types.
    - `reviewapp-premium/src/screens/useNavigation.ts` was updated to reflect the new `FLOW_ORDER` sequence.
    - `reviewapp-premium/src/App.tsx` was updated to render the newly migrated screens.
    - `reviewapp-premium/src/screens/EntryScreen.tsx` was updated to start the new game flow by navigating to `aboutYou`.

## Remaining Steps

- **Step 5: Round 3: Musical Tiles**:
    - Migrate the mechanics of Round 4 of Easy Mode (Musical Tiles) from the legacy app.
    - If `VibeGameScreen.tsx` in `reviewapp-premium` corresponds to this, adapt it. Otherwise, create a new `MusicalTilesScreen.tsx`.
- **Step 6: Round 5: Slingshot Game**:
    - Configure existing `SlingshotGameScreen.tsx` with 4 jars, using question groups from Round 5 of Easy Mode from the legacy app.
    - Implement 3 turns mechanic, where rewards are determined by turns used.
    - Migrate relevant Round 5 question data from the legacy app and integrate it into the `SlingshotGameScreen`'s data model.
