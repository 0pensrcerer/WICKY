I want to create alarms for the metric currently being monitored. These alarms dont have to persist if the user closes the page or plugin.
Basically if the metric goes above a certain threshold, or below, I want to be alerted. when I click on the button create alarm it should have a field that says set threshold. I then type in the amount like 100m or -20m. Should be a button to make it an absolute value, for example if the smartflow goes up 50m or down 50m it should trigger if I have absolute selected. These alarms should be based on total value since the 5 minute boundary started.

## Questions to Define Functionality

### Alarm Creation & Configuration
1. Should users be able to create multiple alarms for the same metric?
No just one
2. What should be the default threshold value when creating a new alarm?
no default or 0
3. Should there be validation on threshold values (min/max limits)?
no validation
4. How should the "absolute value" toggle be presented in the UI (checkbox, toggle switch, radio buttons)?
checkbox
5. Should users be able to name/label their alarms for easier identification?
no

### Alarm Triggering & Behavior
6. What happens when an alarm is triggered? (visual alert, sound, popup, notification)
a tone shuld alternate between high low, this should sound for 3 seconds
7. Should alarms trigger only once per 5-minute boundary or continuously while threshold is exceeded?
only trigger once
8. If an alarm triggers, should it automatically reset for the next 5-minute boundary?
Yes it should reset
9. Should there be a "snooze" or "acknowledge" function for triggered alarms?
Yes, when you hit the acknowledge button it should shut off the alarm


### Alarm Management
11. Should users be able to temporarily disable alarms without deleting them?
No
12. How should users edit existing alarm thresholds?
They should not edit alarms, they should just hit a delete button and create a new one
13. Should there be a "delete all alarms" option?
There should only be one alarm at a time
14. Should alarms show their current status (active, triggered, disabled)?
Yes
15. Should there be a history/log of when alarms were triggered?
yes

### UI/UX Considerations
16. Where should the "Create Alarm" button be positioned in the interface?
at the top next to the popout button
17. Should there be a dedicated alarms panel/section to manage all alarms?
No the alarms display should be below the 2 charts
18. How should active alarms be visually represented on the chart/interface?
They should not be displayed on the chart.
19. Should threshold lines be drawn on the chart to show alarm levels?
No
20. What should happen to alarms when the user switches to monitoring a different metric?
They should be deleted

### Technical Considerations
21. Should alarm checking happen in real-time or at specific intervals?
real time using the same data we've already parsed from the website
22. How should the system handle performance with many active alarms?
There should only be one alarm at a time
23. Should there be a maximum number of alarms per metric?
There should only be one alarm at a time
