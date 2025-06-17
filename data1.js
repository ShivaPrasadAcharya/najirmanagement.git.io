// data1.js - Legal Cases Dataset
var data1 = `सिनं,DNo,नेकाप,Vol,Date,Case Name,Party1,Party 2,Bench,Remark1,Remark 2,Remark 3,Remark 4,Remark 5
1,spa,"45,46",३,15-01-2025,Smith vs Jones,John Smith,Mary Jones,Bench-1,Initial hearing,Documents pending,N/A,N/A,N/A
2,dta,46,३,16-01-2025,State vs Brown,State,Robert Brown,Bench-2,Criminal case,Bail granted,Next hearing 2025-02-01,N/A,N/A
3,rpa,47,४,17-01-2025,Johnson Estate,Estate of Johnson,City Council,Bench-1,Property dispute,Survey required,Expert witness needed,N/A,N/A
4,शिव,48,४,18-01-2025,ABC Corp vs XYZ Ltd,ABC Corporation,XYZ Limited,Bench-3,Contract dispute,Arbitration clause,Settlement discussions,High value case,Media attention
5,आचार्य,49,3,19-01-2025,Davis vs Wilson,Michael Davis,Sarah Wilson,Bench-1,Divorce proceedings,Asset division,Custody dispute,N/A,N/A
6,116,50,4,20-01-2025,Tech Corp vs StartUp,Tech Corporation,StartUp Inc,Bench-2,IP violation,Patent dispute,Injunction sought,Fast track,N/A`;

// Dataset metadata
var data1Info = {
    name: "Legal Cases",
    description: "Court case management system data",
    emoji: "⚖️",
    columns: 14,
    primaryKey: "CaseNo"
};