/*
@author: Fouzia Alzhrani 
@file: decodes extracted event data into human-readable format.
@module: decoder
@version: 1.0.0
*/

//web3js api
const Web3 = require('web3');
var web3 = new Web3( Web3.givenProvider || new Web3.providers.WebsocketProvider('ws://remotenode.com:8546'));
const timestamp = require('unix-timestamp');


var lastBlockNo;
let totalRows=0;

function decodeLogText(text,  events){
    let decodedLog=[];
    for (var i=0, len=text.length; i<len; i++){
        let decodedLogRecord={};
        
        //copy non-decodable data
        decodedLogRecord.transactionHash=text[i]['transactionHash'];
        decodedLogRecord.resource=text[i]['address'];
        
        //decode topic0 with corresponding event name
        for(var k=0; k<events.length; k++){
            
            //decode topic0 with corresponding event name
            if (text[i]['topics'][0]===events[k].signature){
                decodedLogRecord.activity=events[k].name;
                
                            //decode data feild
                let indexedTopics=[];
                if(events[k].anonymous===false){      
                    text[i]['topics'].shift(); //remove topic[0] for non-anonymous event
                    indexedTopics=text[i]['topics']; 
                }
               // console.log(indexedTopics);
                let result=web3.eth.abi.decodeLog(events[k].inputs, text[i]['data'],indexedTopics);
                for(y=0; y<=events[k].inputs.length; y++)
                    {delete result[y];}
                decodedLogRecord.data=result;
                //console.log(decodedLogRecord.data);
            }

        }//end for event names
        
        //convert timestamp
        decodedLogRecord.timeStamp=timestamp.toDate(text[i]['timeStamp']*1);
        
        //decode block number from hex to number 
        decodedLogRecord.blockNumber=web3.utils.hexToNumberString(text[i]['blockNumber']);
        
        //decode transaction index from hex to number string
        decodedLogRecord.transactionIndex=web3.utils.hexToNumberString(text[i]['transactionIndex']);
        
        //decode log index from hex to number string
        decodedLogRecord.logIndex=web3.utils.hexToNumberString(text[i]['logIndex']);
        
        //decode gas used from hex to number string
        decodedLogRecord.gasUsed=web3.utils.hexToNumberString(text[i]['gasUsed']);
        
        //decode gas price from hex to number string
        decodedLogRecord.gasPrice=web3.utils.hexToNumberString(text[i]['gasPrice']);

        //console.log(decodedLogRecord);
        decodedLog.push(decodedLogRecord);
        
        //get last block#
        if(i===len-1){
          setLastBlockNumber(decodedLog[i]['blockNumber']);
          setActivityCount(len);
           // console.log(decodedLogText[i]['blockNumber']);
        }
        
    }//end for logText
    
    return decodedLog;
}


function setLastBlockNumber(number){
     lastBlockNo=number; 
}

function getLastBlockNumber(){
    return lastBlockNo;
}

function setActivityCount(len){
    totalRows=len;
}

function getActivityCount(){
    return totalRows;
}
module.exports={decodeLogText, setLastBlockNumber, getLastBlockNumber, setActivityCount, getActivityCount};