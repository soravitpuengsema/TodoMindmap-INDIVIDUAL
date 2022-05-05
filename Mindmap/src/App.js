import './App.css';
import React, { useState, useEffect} from 'react';
import ReactDOM from "react-dom";
import MindElixir, { E } from "mind-elixir";
import painter from 'mind-elixir/dist/painter';
import PptxGenJS from "pptxgenjs";
import { Button, Form, InputGroup, FormControl } from 'react-bootstrap';
import TodoListDataService from "./services/todo.service";
import Popup from 'reactjs-popup';
import { Scrollbars } from 'react-custom-scrollbars-2';
import mindmaptotodo from './tutorial.png';
import Fab from '@mui/material/Fab';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { paperClasses } from '@mui/material';
import hotkeys from 'hotkeys-js';
import { Box, ChakraProvider } from "@chakra-ui/react";

//

var mindstring = '';

let datajson = '';

let updateCheck = false;

function App() {

  let mind = null;
  let selectnode = null;
  let dbnow = null;
  let dbMindmap = null;

  //สร้างมายแมพ
  useEffect(() => {

    TodoListDataService.getAll()
    .then(response =>{
      if ( response !== null ) {
        console.log(response.data);
        dbnow = response.data;
        dbMindmap = response.data;
        var datadb = databaseToJSON(response.data);
        let options = {
          el: "#map",
          direction: MindElixir.LEFT,
          data: datadb,
          draggable: true,
          contextMenu: true,
          toolBar: true,
          nodeMenu: true,
          keypress: true,
          allowUndo: true,
          contextMenuOption: {
            focus: true,
            link: true,
            extend: [
              {
                name: 'Todo Tag',
                onclick: () => {
                  console.log('todotagselectnode ',selectnode)
                  mind.updateNodeTags(selectnode,['Todo'])
                },
              },
              {
                name: 'Delete Tag',
                onclick: () => {
                  console.log('deltagselectnode ',selectnode)
                  mind.updateNodeTags(selectnode,[])
                },
              }
            ],
          },
        }
        mind = new MindElixir(options);

        mind.initSide();
    
        mind.getAllDataString();

        hotkeys('t', function(event, handler) {
          event.preventDefault();
          console.log('todotagselectnode ',selectnode)
          if ( selectnode !== undefined && selectnode !== null ) {
            mind.updateNodeTags(selectnode,['Todo'])
            mind.refresh();
          }
        });

        hotkeys('d', function(event, handler) {
          event.preventDefault();
          console.log('deltodoselectnode ',selectnode)
          if ( selectnode !== undefined && selectnode !== null ) {
            mind.updateNodeTags(selectnode,[])
            mind.refresh();
          }
        });
    
        mind.bus.addListener('operation', operation => {
    
          mindstring = mind.getAllData();
    
          //เพิ่ม tags Todo
          if (operation.obj.hasOwnProperty('tags') ) { //ตัวมันเองคือ todo title
            if ( operation.name == 'editTags' || operation.name == 'removeNode' || operation.name == 'finishEdit') {
              if ( operation.obj.tags.includes('Todo') || operation.origin.includes('Todo') ) {
                console.log(operation);
                console.log("====Todo Title trigger====")
                updateTitleNode(operation);
              }
            }
          } else if ( !operation.obj.hasOwnProperty('root') && operation.obj.parent.hasOwnProperty('tags') ) { //desc
            if ( operation.name == 'removeNode' || operation.name == 'finishEdit' ) {
              if ( operation.obj.parent.tags.includes('Todo') ) {
                console.log(operation);
                console.log("====Todo Desc trigger====")
                updateDescNode(operation);
              }
            }
          }
        })

        mind.bus.addListener('selectNode', node => {
          selectnode = node;
        })

        mind.bus.addListener('unselectNode', node => {
          selectnode = node;
        })
      }
    })
    .catch(e =>{
      console.log(e);
    })
  },[]);

  //get db ทุกๆ 3 วิ โดยจะต้องไม่ได้กดโนดและไม่ได้ทำการอัพเดท db อยู่
  useEffect(() => {
    const interval = setInterval(() => {
      TodoListDataService.getAll()
      .then(response =>{
        
        if(!(JSON.stringify(response.data) == JSON.stringify(dbMindmap)) && selectnode == undefined && updateCheck == false){
          console.log('update Mindmap');
          console.log(response.data)
          dbMindmap = response.data;
          let dbjson = databaseToJSON(response.data);
          mind.nodeData = dbjson.nodeData;
          mind.refresh();
        }
      })
      .catch(e =>{
          console.log(e);
      })
    }, 3000);
  
    return () => clearInterval(interval);
  }, []);

  //Export ไปยัง Database แบบใหม่ อัพเดทเฉพาะรายการที่แก้ไข
  const updateTitleNode = (ope) => { //แก้ไขโนดชื่อรายการ Title
    updateCheck = true;

    if ( ope.name == 'editTags' && ope.obj.tags.includes('Todo') ) { //เพิ่ม tag todo -ครีเอท
      console.log('T เพิ่ม tag todo');
      if ( !ope.obj.hasOwnProperty('children') || ope.obj.children.length == 0 ) { //ไม่มีลูก desc
        let tododata = 
        {
          title: ope.obj.topic,
          description: null,
          published: false,
          priority: false,
          duedate: null,
          nodeid: ope.obj.id
        }
        TodoListDataService.create(tododata)
          .then(response => {
              console.log('Add single todo (no desc)',response.data);
              afterUpdate();
          })
          .catch(e => {
              console.log(e);
          });
      } else { //มีลูก desc วนแอดที่มี
        for ( let i = 0 ; i < ope.obj.children.length ; i++ ) {
          console.log(i)
          let todotemp =
          {
            title: ope.obj.topic,
            description: ope.obj.children[i].topic,
            published: false,
            priority: false,
            duedate: null,
            nodeid: ope.obj.children[i].id
          } 
          TodoListDataService.create(todotemp)
            .then(response => {
                console.log('Add multiple',response.data);
            })
            .catch(e => {
                console.log(e);
            });
        }
        setTimeout(() => { console.log('wait 2 seconds');afterUpdate(); }, 2000)
      }
    } else if ( ope.name == 'editTags' && ope.origin.includes('Todo') ) { //ลบ tag todo -ลบ
      console.log('T ลบ tag todo');
      if ( !ope.obj.hasOwnProperty('children') || ope.obj.children.length == 0 ){ //ไม่มีลูก ลบตัวมันเลย
        TodoListDataService.delete(ope.obj.id)
          .then(response => {
              console.log('Delete single title node',response.data);
              afterUpdate();
          })
          .catch(e => {
              console.log(e);
          });
      } else { //มีลูก desc ลบรายการ title นี้ให้หมด
        for ( let i=0 ; i < ope.obj.children.length ; i++ ) {
          TodoListDataService.delete(ope.obj.children[i].id)
          .then(response => {
              console.log('Delete multiple title node',response.data);
          })
          .catch(e => {
              console.log(e);
          });
        }
        setTimeout(() => { console.log('wait 2 seconds');afterUpdate(); }, 2000)
      }

    } else if ( ope.name == 'removeNode' ) { //ลบโนดไปเลย -ลบ
      console.log('T ลบโนดไปเลย');
      if ( !ope.obj.hasOwnProperty('children') || ope.obj.children.length == 0 ){ //ไม่มีลูก ลบตัวมันเลย
        TodoListDataService.delete(ope.obj.id)
          .then(response => {
              console.log('Delete single title node',response.data);
              afterUpdate();
          })
          .catch(e => {
              console.log(e);
          });
      } else { //มีลูก desc ลบรายการ title นี้ให้หมด
        for ( let i=0 ; i < ope.obj.children.length ; i++ ) {
          TodoListDataService.delete(ope.obj.children[i].id)
          .then(response => {
              console.log('Delete multiple title node',response.data);
          })
          .catch(e => {
              console.log(e);
          });
        }
        setTimeout(() => { console.log('wait 2 seconds');afterUpdate(); }, 2000)
      }

    } else if ( ope.name == 'finishEdit' ) { //แก้ไข -อัพเดท
      console.log('T แก้ไขโนด');
      if ( !ope.obj.hasOwnProperty('children') || ope.obj.children.length == 0 ){ //ไม่มีลูก ไม่มี desc
        let singledata =
        {
          title: ope.obj.topic,
          description: null,
          published: false,
          priority: false,
          duedate: null,
          nodeid: ope.obj.nodeid
        }
        TodoListDataService.update(ope.obj.id,singledata)
          .then(response => {
              console.log('Update single title node',response.data);
          })
          .catch(e => {
              console.log(e);
          });
      } else { //มีลูก desc แก้ไขรายการ title นี้ให้หมด
        for ( let i=0 ; i < ope.obj.children.length ; i++ ) {
          let multipledata =
          {
            title: ope.obj.topic,
            description: ope.obj.children[i].topic,
            published: false,
            priority: false,
            duedate: null,
            nodeid: ope.obj.children[i].id
          }
          TodoListDataService.update(ope.obj.children[i].id,multipledata)
          .then(response => {
              console.log('Update multiple title node',response.data);
          })
          .catch(e => {
              console.log(e);
          });
        }
        setTimeout(() => { console.log('wait 2 seconds');afterUpdate(); }, 2000)
      }
    }
  }
  const updateDescNode = (ope) => { //แก้ไขโนดชื่อข้อมูล Description
    updateCheck = true;

    if ( ope.name == 'removeNode' ) { //ลบโนดไปเลย -ลบ
      console.log('D ลบโนดไปเลย');
      if (ope.obj.parent.children.length == 0){ //ไม่มีลูกแล้ว ลบแล้วสร้าง todo ที่ desc เป็น null
        console.log('ลูกตัวท้าย')
        TodoListDataService.delete(ope.obj.id)
          .then(response => {
              console.log('Delete',response.data);
              let data = 
              {
                title: ope.obj.parent.topic,
                description: null,
                published: false,
                priority: false,
                duedate: null,
                nodeid: Date.now()+ope.obj.parent.topic.replace(/ /g,"_")
              }
              TodoListDataService.create(data)
                .then(response => {
                    console.log('Add',response.data);
                    afterUpdate();
                })
                .catch(e => {
                    console.log(e);
                });
          })
          .catch(e => {
              console.log(e);
          });
      } else {
      //console.log(ope.obj.id);
        TodoListDataService.delete(ope.obj.id)
          .then(response => {
              console.log('Delete',response.data);
              afterUpdate();
          })
          .catch(e => {
              console.log(e);
          });
        }

    } else if ( ope.name == 'finishEdit' && ope.origin == 'new node') { //เพิ่มโนด -สร้าง
      console.log('D เพิ่มโนด');
      console.log(ope.obj.parent.hasOwnProperty('children'))
      if (ope.obj.parent.children.length == 1){ //ลูกตัวเดียวใหม่ ลบตัวเดี่ยวแล้วสร้างตัวมี desc
        let data =
        {
          title: ope.obj.parent.topic,
          description: ope.obj.topic,
          published: false,
          priority: false,
          duedate: null,
          nodeid: ope.obj.id
        }
        TodoListDataService.delete(ope.obj.parent.id)
          .then(response => {
            console.log('Delete single node with no desc',response.data);
            TodoListDataService.create(data)
              .then(response => {
                  console.log('Add new to (new desc node)',response.data);
                  afterUpdate();
              })
              .catch(e => {
                  console.log(e);
              });
          })
          .catch(e => {
              console.log(e);
          });
      } else {
        let datatemp =
        {
          title: ope.obj.parent.topic,
          description: ope.obj.topic,
          published: false,
          priority: false,
          duedate: null,
          nodeid: ope.obj.id
        }
        TodoListDataService.create(datatemp)
          .then(response => {
              console.log('Add new to (new desc node)',response.data);
              afterUpdate();
          })
          .catch(e => {
              console.log(e);
          });
      }
      
    } else if ( ope.name == 'finishEdit' ) { //แก้ไข -อัพเดท
      console.log('D แก้ไขโนด');
      let data =
      {
        title: ope.obj.parent.topic,
        description: ope.obj.topic,
        published: false,
        priority: false,
        duedate: null,
        nodeid: ope.obj.id
      }
      TodoListDataService.update(ope.obj.id,data)
        .then(response => {
            console.log('Edit',response.data);
            afterUpdate();
        })
        .catch(e => {
            console.log(e);
        });
    }
  }

  //ทุกครั้งที่ส่งข้อมูลจะดึง data db แล้วเก็บใน temp
  const afterUpdate = () => {
    TodoListDataService.getAll()
      .then(response => {
        if(!(JSON.stringify(response.data) == JSON.stringify(dbMindmap)) && selectnode == undefined && updateCheck == false){
          console.log('update Mindmap');
          console.log(response.data)
          dbMindmap = response.data;
          let dbjson = databaseToJSON(response.data);
          mind.nodeData = dbjson.nodeData;
          mind.refresh();
          updateCheck = false;
        }
      })
      .catch(e => {
        console.log(e)
      });
  }

  //Export ไปยัง Database (แบบเก่า) จะใช้กับ import JSON
  const exportTodo = (todoData) => {
    updateCheck = true;
    TodoListDataService.deleteAll()
      .then(response => {
        for (var k = 0 ; k < todoData.length ; k++){

          TodoListDataService.create(todoData[k])
            .then(response => {
                console.log('Add ',response.data);
            })
            .catch(e => {
                console.log(e);
            });
        }
        console.log('wait 2 seconds')
        setTimeout(() => { console.log('wait done');

          TodoListDataService.getAll()
            .then(response => {
              dbMindmap = response.data
              updateCheck = false;
            })
            .catch(e => {
              console.log(e)
            });
        }, 2000);
      })
      .catch(e => {
        console.log(e);
        updateCheck = false;
    });
  }

  //แปลง db response.data ทีได้เป็นในรูป mindmap json
  const databaseToJSON = (db) => {
    var dbjson = {
      "nodeData": {
        "id": Date.now()+"root",
        "topic": "Todo",
        "root": true,
        "children": []
      }
    }
    const result = Array.from(new Set(db.map(s => s.title)))
    .map(titles => {
      var desctemp = [];
      var idtemp = '';
      var descarraytemp = db.filter(s => s.title === titles).map(a => a.description);
      var idarraytemp = db.filter(s => s.title === titles).map(a => a.nodeid);
      for (let i = 0 ; i < descarraytemp.length ; i++) {
        if ( descarraytemp[i] == null ) {
        } else {
          desctemp.push({
            "topic": descarraytemp[i],
            "id": idarraytemp[i]
          })
        }
      }
      if ( descarraytemp[0] == null ) {
        console.log(titles + ' no children')
        idtemp = idarraytemp[0]
      } else {
        idtemp = Date.now()+titles.replace(/ /g,"_")
      }
      return {
        topic: titles,
        id: idtemp,
        tags: ['Todo'],
        children: desctemp
      }
    })
    dbjson.nodeData.children = result;
    console.log('Mindmap ',dbjson.nodeData.children);
    return dbjson;
  }

  //แปลง Mindmap เป็น Todo เฉพาะที่มี tags 'Todo'
  const getAllTodo = (obj,objArray) => {

    for (var i = 0 ; i < obj.children.length ; i++){ //ไล่ทุกลูกของ root => Title Todo

      if ( obj.children[i].hasOwnProperty('tags') ) {
        for ( var j = 0 ; j < obj.children[i].tags.length ; j++) {
          if ( obj.children[i].tags[j] == 'Todo' ) {
            if ( !obj.children[i].hasOwnProperty('children') || obj.children[i].children.length == 0){  //ถ้าไม่มีลูกต่อ (Desc) ให้สร้างรายการเลย

              var tododata = 
              {
                title: obj.children[i].topic,
                description: null,
                published: false,
                priority: false,
                duedate: null,
                nodeid: obj.children[i].id
              }
              objArray.push(tododata);

            } else {

              for (var j = 0 ; j < obj.children[i].children.length ; j++){

                var tododata = 
                {
                  title: obj.children[i].topic,
                  description: obj.children[i].children[j].topic,
                  published: false,
                  priority: false,
                  duedate: null,
                  nodeid: obj.children[i].children[j].id
                }
                objArray.push(tododata);
              }
            }
            break;
          }
        }
      }
    }
    return objArray;
  }

  //(Import JSON) Choose JSON File
  const readJSON = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = e => {
      console.log(e.target.result);
      datajson = e.target.result;
      //importData(datajson);
      let parsedata = JSON.parse(datajson)
      mind.nodeData = parsedata.nodeData;
      mind.refresh();
      
      let todoImport = [];
      let mindImport = mind.getAllData();
      todoImport = getAllTodo(mindImport.nodeData,todoImport);
      console.log(todoImport);
      if ( todoImport.length == 0 ){
        console.log('Not update, no todo node')
        //ถ้าที่ import มาไม่มีโนด tag todo เลยจะไม่อัพเดทขึ้น db
      } else {
        console.log('Update DB from imported file')
        exportTodo(todoImport);
      }
    };
  };

  //ให้กลางหน้าจอไปอยู่ที่โนดนั้นๆ
  const goToNode = (width,heigth) => {
    //console.log(mind.container)
    //console.log(10000-(mind.container.offsetWidth/2),10000-(mind.container.offsetHeight/2))
    mind.container.scrollTo(
      width-906.5,
      heigth-271
    )
  }

  var searchString = '';
  var searchTemp = '';
  var retrieveId = [];
  var lastIdCheck = false;
  var foundId = false;

  //ค้นหาชื่อ
  const searchNode = (e) => {
    e.preventDefault();

    if (searchString == ''){ //ไม่ใส่อะไรในช่องเซิช
      window.alert('Type something!')
      searchTemp = '';
      return;
    }
    if (searchString !== searchTemp){ //เซิชคำใหม่ รีทั้งหมด
      console.log(searchString, searchTemp)
      console.log('แก้คำใหม่ เซิชใหม่')
      foundId = false;
      lastIdCheck = false;
    }

    console.log(retrieveId);
    var allMind = mind.getAllData();

    if (foundId == false && lastIdCheck == false){ //เริ่มเซิชใหม่
      console.log('เริ่มเซิชใหม่')
      retrieveId = [];
      searchData(allMind.nodeData,searchString);
      searchTemp = searchString;
      console.log(retrieveId);
    }

    if (foundId == false){ //ไม่เจอเลย
      window.alert(searchString + ' not found.')
      lastIdCheck = false;
    } else { //เจออยู่ก็ไปหาโนดนั้นๆ

      mind.selectNode(E(retrieveId[0]))

      let xystring = E(retrieveId[0]).parentElement.parentElement.getAttribute('style');

      if ( xystring == null ){
        xystring = E(retrieveId[0]).parentElement.parentElement.parentElement.parentElement.getAttribute('style');
      }

      let stringsplit = xystring.split(' ')

      var wpointcheck = false;
      var hpointcheck = false;
      var heigthsplit = stringsplit[1]
      var widthsplit = stringsplit[3]

      if (stringsplit[1].includes('.')){
        heigthsplit = stringsplit[1].split('.')
        heigthsplit = heigthsplit[0]
        hpointcheck = true;
      }
      if (stringsplit[3].includes('.')){
        widthsplit = stringsplit[3].split('.')
        widthsplit = widthsplit[0]
        wpointcheck = true;
      }
      else{
        heigthsplit = stringsplit[1];
        widthsplit = stringsplit[3];
      }
      
      var heightNum = heigthsplit.match(/\d/g).join("");
      var widthNum = widthsplit.match(/\d/g).join("");

      if (hpointcheck){
        heightNum += '.5'
      }
      if (wpointcheck){
        widthNum += '.5'
      }

      goToNode(widthNum,heightNum)

      if (retrieveId.length > 2){ //มากกว่า 2
        retrieveId.shift();
        console.log('มากกว่า 2');
        foundId = true;
        lastIdCheck = false;
        console.log(foundId,lastIdCheck)
      } else if (retrieveId.length == 2){ //ตัวรองท้าย
        retrieveId.shift();
        console.log('ตัวรองท้าย');
        foundId = true;
        lastIdCheck = true;
        console.log(foundId,lastIdCheck)
      } else { //ตัวสุดท้าย == 1 ตัดจบ
        retrieveId.shift();
        console.log('ตัวท้าย เริ่มใหม่');
        lastIdCheck = false;
        foundId = false;
        console.log(foundId,lastIdCheck)
      }
    }
  }

  //เข้าถึงโนดทุกตัวเพื่อหาตัวที่เจอ
  const searchData = (obj,text) => {

    //console.log(obj.topic,text)
    let topicLower = obj.topic.toLowerCase();
    let textLower = text.toLowerCase();
    
    if (topicLower.match(textLower)) {
      //console.log(obj.id)
      retrieveId.push(obj.id);
      foundId = true;

    } else if (!('children' in obj) || obj.children.length === 0){
      return;

    } else {
      for (let i = 0 ; i < obj.children.length ; i++){
        searchData(obj.children[i],text)
      }
    }
  }

  //Export JSON
  const exportData = () => {
    mindstring = mind.getAllData();
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(mindstring)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "data.json";

    link.click();
  };

  //Export Image
  const paint = () => {
    painter.exportPng(mind,'picture');
  }

  //ของการค้นหา
  const handleChange = (event) => {
    searchString =  event.target.value;
    //console.log(searchString)
  }

  return (
    <>
    <div>
      <Form.Group controlId="formFile" className="mb-3">
        <Form.Label>Import JSON File</Form.Label>
        <Form.Control type="file" onChange={readJSON}/>
      </Form.Group>
      <div>
      <form>
        <input
          type="text"
          name="text"
          placeholder="Search..."
          //value={searchtext}
          onChange={handleChange}
        />
        <button onClick={(e)=>searchNode(e)}>Search</button>
      </form>
    </div>
    </div>
    <div >
      <Button variant="outline-secondary" onClick={() => paint()}>Export PNG</Button>{' '}
      <Button variant="outline-success" onClick={() => exportData()}>Export JSON</Button>{' '}
      {/* <Button variant="outline-success" onClick={() => goToNode()}>search</Button>{' '}   */}
      <Popup
        trigger={<Fab
            sx={{
              position: "fixed",
              bottom: (theme) => theme.spacing(2),
              right: (theme) => theme.spacing(2)
            }}
            color="secondary"
    >
            <QuestionMarkIcon />
          </Fab>} modal>
          <div className='container'>
            <div style={{fontWeight: 'bold', textAlign: 'center', marginTop: '15px', fontSize: '25px'}}> Create Mindmap for Todo List </div>
            <div style ={{textAlign: 'center', marginBottom: '15px'}}>
              <br />
              การจะ Export Mindmap ไปยัง TodoList นั้น Mindmap จะต้องมีเงื่อนไขดังนี้
              <br />
              <img src={mindmaptotodo} style={{height:'400px'}}></img>
              <br />
              ลูกของหัวข้อจะเป็น Title รายการ Todo และลูกของ Title นั้นจะเป็น Description ซึ่งเมื่อกดปุ่ม Export ไปยัง Todo App แล้วจะเป็นไปดังภาพ
              <br />
            </div>
          </div>
      </Popup>
    </div>
    <div id="map" style={{ height: "600px", width: "100%" }} />
    </>
  );
}

export default App;