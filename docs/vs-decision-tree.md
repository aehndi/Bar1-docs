# VS Decision Tree

## Weekly Decision Tree

```mermaid
flowchart TD
    A[Start of new VS week] --> B{Did we win last week?}

        B -->|Yes| C[Declare Eco Week<br>Save RSS<br>Only personal chests and minimum required points]
            B -->|No| D{Can the opponent be scouted?}

                D -->|No| E[Wait and monitor possible opponents]
                    E --> D

                        D -->|Yes| F{Is the opponent too strong?}

                            F -->|Yes, clearly stronger| G[Declare Eco Week or early abort<br>Goal: stay in Gold class]
                                F -->|No| H{Is the opponent about equal?}

                                    H -->|Yes| I[Start Monday with an overpower push<br>Try to bait the opponent into an Eco Week]
                                        H -->|No, we are stronger| J[Active win week<br>Secure early days]

                                            I --> K{Does the opponent answer with a hard push?}
                                                K -->|Yes| L[Re-evaluate<br>Use a controlled abort if needed]
                                                    K -->|No| M[Play out the win consistently]

                                                        J --> N{Is the win realistic without overcommitting?}
                                                            N -->|Yes| M
                                                                N -->|No| L

                                                                    C --> O[Move to next week]
                                                                        G --> O
                                                                            L --> O
                                                                                M --> O
```

## 4-Week Cycle

```mermaid
flowchart TD
    A[Week 1] --> B{Week 1 Result?}
    B -->|Win| C[Week 2 = Mandatory Eco<br/>Stack RSS Chests only]
    B -->|Loss| D[Week 2 = Scout Opponent]

    D --> E{Opponent Strength?}
    E -->|Green Weak| F[Week 2 Opportunistic Push<br/>Prioritize Days 4-6 2-4pt]
    E -->|Yellow Equal| G[Week 2 Bait Mode<br/>Strong Monday then watch reaction]
    E -->|Red Strong| H[Week 2 Eco Light<br/>Chests Pflichtpunkte stack]

    F --> I[To Week 3]
    G --> I
    H --> I
    C --> J{Week 3 Winnable?}
    I --> J

    J -->|Yes| K[Week 3 Light Push]
    J -->|No| L[Week 3 Eco Light]

    K --> M[Week 4 Main Push]
    L --> M

    M --> N{Week 4 Result?}
    N -->|Win| O[Cycle Success<br/>1-2 Wins achieved<br/>Eco next cycle]
    N -->|Loss| P[Hold Gold Class<br/>Restart Cycle]
```
