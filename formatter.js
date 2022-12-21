/*
@author: Fouzia Alzhrani 
@file: formats event data into CSV format ready for process mining.
@version: 1.1.0
*/

// file system
const fs = require('fs');
const { Parser } = require('json2csv');
const json2csvParser = new Parser();

function toCSV(logJSON, FileName, app){
    let dir='./event-logs/'+app;
    
    //create new folder for each DApp
    if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
    }
    
    
    var csv=json2csvParser.parse(logJSON);
    
    //write csv file
    fs.stat(dir+'/'+FileName, function (err, stat) {
        if (err == null) { //file exist

            //remove headers from multiple copies of a log     
            csv=csv.replace("transactionHash,resource,activity,data,timeStamp,timeStamp,blockNumber,transactionIndex,logIndex,gasUsed,gasPrice", " ");

            // append new logs to an existing file
            fs.appendFileSync(dir+'/'+FileName, csv, function (err) {
                    if (err) throw err;
                });
        }//end if err=null
        else{
            // write CSV to a new file
            fs.writeFileSync(dir+'/'+FileName, csv);
        }
    });// end fs.stat

}

module.exports={toCSV};