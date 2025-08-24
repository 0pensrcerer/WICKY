Charting requirements:
these charts will be placed in the side panel.
We have limited screen availability so we will give our users the ability to choose which charts they want to view/
theyll have a searchable list of all the 21 financial metrics.
they'll select a financial metric and the plugin will begin charting that plugin.
For the first version of this charting plugin we will only have 2 charts, momoflow, and smart flo.
(dont worry about charting historical data for now) Just have it start charting data from the minute the user selects it
the x axis on all charts will be time.
The chart should be aware of the actual system time and display it on the bottom
I want a 5 minute rolling window for the chart. there should only be 5 minutes displayed.
The chart should update the current bar (each bar is a minute) as new data comes in.
The y axis for smartflow will be a sum of the changes to that metric for that minute of time. 
The y axis for momoflow will be  a sum of the changes to that metric for that minute of time.
The metric 

## Data Collection & Processing
1. 1.
   How should the system handle missing data points? If no changes occur for a particular minute, should the chart show zero or maintain the previous value?

A. Maintain the previous value.
2. 2.
   How should the "sum of changes" be calculated exactly?
A.so every time the the mutation observer sees a change to a new value in the metric being charted the chart should add the diff between the current value of that metric and the previous value of that metric to the current bar.
3. 3.
   What should happen if multiple changes occur within the same second? Should they be aggregated or tracked individually?
A. Aggregate them.

4. 4.
   What is the expected behavior if the extension is closed and reopened? Should it attempt to reconstruct the previous 5 minutes from stored data?
A. No it should not. we will not implement historical data for this implementation
## UI & Interaction
5. 1.
   How should the chart visually indicate that it's receiving real-time updates? Should there be any visual indicators when new data arrives?
A. No we will not
6. 2.
   What should happen when a user switches between metrics? Should the previous chart data be preserved in memory for quick switching back?
A. No we will not implement this feature yet.
7. 3.
   Should users be able to pause the live updates? If so, how should the paused state be indicated?
A. No we will not implement this feature yet.
8. 4.
   What is the expected behavior when the browser tab is inactive? Should data collection continue in the background?
A. No we will not implement this feature yet.
## Time Management
9. 1.
   How should the chart handle time zone considerations? Should it display local time or a specific time zone?
A. We will display local time.
10. 2.
    What exactly should the time labels on the x-axis show? Just minutes, or hours:minutes:seconds?
A. We will display just minutes. So say that I start using the chart at 12:23. The chart should start updating the third bar with the values and then remove all data and start charting again at 12:25
11. 3.
    How should the chart handle the transition to a new 5 minute window? 
    A. the chart will delete the previous 5 minute window and start from 0
12. 4.
    What is the expected behavior if the system clock changes during operation? (e.g., daylight saving time changes)
    A. We will not implement this feature yet.
## Error Handling
13. 1.
    How should the chart handle connection issues or data extraction failures? Should it show gaps, estimated values, or error indicators?
    A. We will not implement this feature yet.
14. 2.
    What is the expected behavior if the data format changes unexpectedly? How resilient should the parsing be?
    A. We will not implement this feature yet.
15. 3.
    Is there a maximum value range expected for these metrics? This would help determine appropriate scaling for the y-axis.
    A. I want to implement autoscaling in increments of 20 milion once the value hits positive 20 milion or negatibe 20 million the scale adds 20 million more.
## Performance
16. 1.
    What is the expected update frequency? How often might the data change in a real-world scenario?
    A. The data will change every half second more or less.
17. 2.
    Are there any performance constraints to be aware of? Maximum memory usage, CPU utilization limits, etc.
    a. we will talk about this after some testing
18. 3.
    Should the chart implementation prioritize rendering performance or data accuracy? This helps determine appropriate optimization strategies.
    a. we will talk about this after some testing