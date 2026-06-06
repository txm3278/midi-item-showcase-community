# Replace ATL AE keys by token:
# Note: 
# - ATL.light.alpha value must be squared
# - ATL.detectionModes.<mode>.range must also set enabled true: ATL.detectionModes.<mode>.enabled
- Crown of Stars
- Visage of the Astral Self
- Channel Divinity
- Flame Tongue Greatsword
- Flame Tongue Longsword
- Flame Tongue Rapier
- Flame Tongue Scimitar
- Flame Tongue Shortsword
- Moon Touched Greatsword
- Moon Touched Longsword
- Moon Touched Rapier
- Moon Touched Scimitar
- Moon Touched Shortsword
- Sun Blade
- Adventurer's Ring
- Flame Tongue

# Migrate senses sight: system.attributes.senses.<sight> to system.attributes.senses.range.<sight>
# Note: upgrade does not work if there is no initial value
- Visage of the Astral Self|Visage of the Astral Self: replace system.attributes.senses.devilsSight by system.attributes.senses.range.devilsSight

# Update duration turnEnd
- replace {"turns": 1} by {"value": null, "units": "seconds", "expiry": "turnEnd"}
  once migrated it becomes: {"value": 1, "units": "turns", "expiry": "turnStart"}

- Absorbing Tattoo, Acid|Absorbing Tattoo, Acid
- Absorbing Tattoo, Cold|Absorbing Tattoo, Cold
- Absorbing Tattoo, Force|Absorbing Tattoo, Force
- Absorbing Tattoo, Lightning|Absorbing Tattoo, Lightning
- Absorbing Tattoo, Necrotic|Absorbing Tattoo, Necrotic
- Absorbing Tattoo, Poison|Absorbing Tattoo, Poison
- Absorbing Tattoo, Psychic|Absorbing Tattoo, Psychic
- Absorbing Tattoo, Radiant|Absorbing Tattoo, Radiant
- Absorbing Tattoo, Thunder|Absorbing Tattoo, Thunder
- Deflect Attacks|Deflect Attacks - Damage Reduction
- Deflect Missiles|Deflect Missiles - Damage Reduction
- Drunkard's Luck|Drunkard's Luck
- Drunken Technique|Drunken Technique
- Flash of Genius|Flash of Genius - Bonus
- Gift of the Metallic Dragon|Gift of the Metallic Dragon - AC Bonus
- Planar Warrior|Marked by Planar Warrior
- Planar Warrior|Planar Warrior
- Psionic Power|Protective Field - Damage Prevention
- Psionic Shield|Psionic Shield - AC Bonus
- Spirit Shield|Spirit Shield - Damage Prevention
- Steady Aim|Steady Aim - Advantage
- Steady Aim|Steady Aim - Movement
- Telekinetic Adapt|Psi Powered Leap
- Tomb of Levistus|Tomb of Levistus
- Warding Flare|Warding Flare
- Warding Maneuver|Warding Maneuver - AC Bonus/Damage Resistance

# Update duration sourceEnd
- replace DAE turnEndSource {"rounds": 1, "turns": 1} by {"value": 1, "units": "rounds", "expiry": "sourceEnd"}
  once migrated it becomes: {"value": 1, "units": "turns", "expiry": "turnStart"}

- Tomb of Levistus|Ice Entombment
- Potent Poison|Potent Poison

# Update duration sourceStart
- replace DAE turnStartSource {"rounds": 1} by {"value": 1, "units": "rounds", "expiry": "sourceStart"}
  once migrated it becomes: {"value": 6, "units": "seconds", "expiry": "turnStart"}

- Corpse Slayer!Corpse Slayer
- Ki|Dodge
- Negative Energy Flood|Negative Energy Flood
- Spiny Shield|Spiny Shield

# Update duration targetEnd
- replace DAE turnEnd {"rounds": 1, "turns": 1} by {"value": 1, "units": "rounds", "expiry": "targetEnd"}
  once migrated it becomes: {"value": 1, "units": "turns", "expiry": "turnStart"}

- Petrifying Gaze|Petrifying Gaze - Effect
- Tasha's Mind Whip|Tasha's Mind Whip


- Sun Blade: replace {"seconds": 0} by {"value": null, "units: "seconds", "expiry": null}
  once migrated it becomes: {"value": 0, "units: "seconds", "expiry": "turnStart"}

- Sorrowfull Fate|Sorrowful Fate - Regret: replace {"seconds" 60} by {"value": 1, "units": "hours", "expiry": "turnStart"}