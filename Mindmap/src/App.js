import './App.css';
import React, { useState, useEffect} from 'react';
import ReactDOM from "react-dom";
import MindElixir, { E } from "mind-elixir";
import painter from 'mind-elixir/dist/painter';
import PptxGenJS from "pptxgenjs";
import { Button, Form } from 'react-bootstrap';
import TodoListDataService from "./services/todo.service";
import Popup from 'reactjs-popup';
import { Scrollbars } from 'react-custom-scrollbars-2';
import mindmaptotodo from './tutorial.png';
import Fab from '@mui/material/Fab';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { paperClasses } from '@mui/material';

var mindstring = '';

let datajson = '';

function App() {

  let mind = null;

  useEffect(() => {

    TodoListDataService.getAll()
    .then(response =>{
      if ( response !== null ) {
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
                name: '',
                onclick: () => {
                  
                },
              },
            ],
          },
        }
        mind = new MindElixir(options);

        mind.initSide();
    
        mind.getAllDataString();
    
        mind.bus.addListener('operation', operation => {
    
          console.log(operation);
          mindstring = mind.getAllData();
          //console.log(operation.name);
    
          //เพิ่ม tags Todo
          if (operation.obj.hasOwnProperty('tags') ) { //ตัวมันเองคือ todo title
            if ( operation.name == 'editTags' || operation.name == 'removeNode' || operation.name == 'finishEdit') {
              if ( operation.obj.tags.includes('Todo') || operation.origin.includes('Todo') ) {
                console.log(operation);
                console.log("====Todo Title trigger====")
                //create db code
                let todoObj = [];
                let mindTodo = mind.getAllData();
                todoObj = getAllTodo(mindTodo.nodeData,todoObj);
                console.log(todoObj);
                exportTodo(todoObj)
              }
            }
          } else if ( !operation.obj.hasOwnProperty('root') && operation.obj.parent.hasOwnProperty('tags') ) { //ตัวมันคือ desc พ่อเป็น todo title
            if ( operation.name == 'removeNode' || operation.name == 'finishEdit' ) {
              if ( operation.obj.parent.tags.includes('Todo') ) {
                console.log(operation);
                console.log("====Todo Desc trigger====")
                //console.log(operation.obj.parent);
                //update db code
                let todoObj = [];
                let mindTodo = mind.getAllData();
                todoObj = getAllTodo(mindTodo.nodeData,todoObj);
                console.log(todoObj);
                exportTodo(todoObj)
              }
            }
          }
        })
      }
    })
    .catch(e =>{
      console.log(e);
    })
  },[]);

  const exportTodo = (todoData) => {
    TodoListDataService.deleteAll()
      .then(response => {
        //console.log('Delete old Todo')
        for (var k = 0 ; k < todoData.length ; k++){

          TodoListDataService.create(todoData[k])
            .then(response => {
                console.log('Add ',response.data);
            })
            .catch(e => {
                console.log(e);
            });
        }
        //window.alert("Add Todo Completed");
      })
      .catch(e => {
        console.log(e);
    });
  }

  //Export to Todo App by button (manually)
  const exportTodoManually = () => {

    var mindTodo = mind.getAllData();
    var todoObj = [];
    todoObj = getAllTodo(mindTodo.nodeData,todoObj);

    console.log(todoObj);

    TodoListDataService.deleteAll()
      .then(response => {
        console.log('Delete old Todo')
        for (var k = 0 ; k < todoObj.length ; k++){

          TodoListDataService.create(todoObj[k])
            .then(response => {
                console.log('Add ',response.data);
            })
            .catch(e => {
                console.log(e);
            });
        }
        window.alert("Add Todo Completed");
      })
      .catch(e => {
        console.log(e);
    });
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

  //Import JSON then convert to mindmap
  const importData = (datajson) => {

    var obj = JSON.parse(datajson);

    let optionsdata = {
      el: "#map",
      direction: MindElixir.LEFT,
      data: obj,
      draggable: true,
      contextMenu: true,
      toolBar: true,
      nodeMenu: true,
      keypress: true, //true 
      allowUndo: true, //ทำ undo, redo manual เอง
      contextMenuOption: {
        focus: true,
        link: true,
        extend: [
          {
            name: '',
            onclick: () => {
              
            },
          },
        ],
      },
    }

    mind = new MindElixir(optionsdata);

    mind.initSide();

    mind.getAllDataString();

    mindstring = mind.getAllData();

    mind.bus.addListener('operation', operation => {

      console.log(operation);
      mindstring = mind.getAllData();

      console.log(operation);
      mindstring = mind.getAllData();
      //console.log(operation.name);

      //เพิ่ม tags Todo
      if (operation.obj.hasOwnProperty('tags') ) { //ตัวมันเองคือ todo title
        if ( operation.name == 'editTags' || operation.name == 'removeNode' || operation.name == 'finishEdit') {
          if ( operation.obj.tags.includes('Todo') || operation.origin.includes('Todo') ) {
            console.log(operation);
            console.log("====Todo Title trigger====")
            //create db code
            let todoObj = [];
            let mindTodo = mind.getAllData();
            todoObj = getAllTodo(mindTodo.nodeData,todoObj);
            console.log(todoObj);
            exportTodo(todoObj)
          }
        }
      } else if ( !operation.obj.hasOwnProperty('root') && operation.obj.parent.hasOwnProperty('tags') ) { //ตัวมันคือ desc พ่อเป็น todo title
        if ( operation.name == 'removeNode' || operation.name == 'finishEdit' ) {
          if ( operation.obj.parent.tags.includes('Todo') ) {
            console.log(operation);
            console.log("====Todo Desc trigger====")
            //console.log(operation.obj.parent);
            //update db code
            let todoObj = [];
            let mindTodo = mind.getAllData();
            todoObj = getAllTodo(mindTodo.nodeData,todoObj);
            console.log(todoObj);
            exportTodo(todoObj)
          }
        }
      }

    })
  }

  //ไม่ได้ใช้ ณ ตอนนี้
  const getDatabase = () => {
  }

  //ไม่ได้ใช้ ณ ตอนนี้
  const databaseToJSON = (db) => {
    var dbjson = {
      "nodeData": {
        "id": Date.now()+"root",
        "topic": "Todo",
        "root": true,
        "children": []
      }
    }
    console.log(dbjson)
    console.log(db)

    const result = Array.from(new Set(db.map(s => s.title)))
    .map(titles => {
      var desctemp = [];
      var arraytemp = db.filter(s => s.title === titles).map(a => a.description);
      for (let i = 0 ; i < arraytemp.length ; i++) {
        if (arraytemp[i] == null) {

        } else {
          desctemp.push({
            "topic": arraytemp[i],
            "id": Date.now()+arraytemp[i]
          })
        }
      }
      return {
        topic: titles,
        id: Date.now()+titles,
        tags: ['Todo'],
        children: desctemp
      }
    })
    console.log(result);
    dbjson.nodeData.children = result;
    console.log(dbjson);
    return dbjson;
  }

  //แปลง Mindmap เป็น Todo เฉพาะที่มี tags 'Todo'
  const getAllTodo = (obj,objArray) => {

    for (var i = 0 ; i < obj.children.length ; i++){ //ไล่ทุกลูกของ root => Title Todo

      //console.log(obj.children[i].topic)

      if ( obj.children[i].hasOwnProperty('tags') ) {
        for ( var j = 0 ; j < obj.children[i].tags.length ; j++) {
          if ( obj.children[i].tags[j] == 'Todo' ) {
            if ( !obj.children[i].hasOwnProperty('children') ){  //ถ้าไม่มีลูกต่อ (Desc) ให้สร้างรายการเลย

              var tododata = 
              {
                title: obj.children[i].topic,
                description: null,
                published: false,
                priority: false,
                duedate: null
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
                  duedate: null
                }
                objArray.push(tododata);
                //console.log(tododata);

              }
            }
            break;
          }
        }
      }
    }
    return objArray;
  }

  //Choose File
  const readJSON = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = e => {
      console.log("e.target.result", e.target.result);
      datajson = e.target.result;
      importData(datajson);
    };
  };

  //Create powerpoint slide
  const createFirstSlide = (obj,pptx) => {
    if (obj.length === 0){
      return;
    } else {

      let slide = pptx.addSlide({ masterName: "FontPage" });
      slide.addText(obj, {x:0.5, y: 2, h: 1, w: "90%", fontFace: "Courier", fontWeight: 'bold', fontSize: 72, align: "center", bold:true })
      slide.background = {path : 'https://i2.wp.com/files.123freevectors.com/wp-content/original/125250-blue-and-white-water-background.jpg?w=800&q=95'}
    
    }
  }

  //Export to powerpoint
  const createSlide = (obj,pptx) => {
    //var mindObj = mind.getAllData()
    //console.log(obj.topic);
    

    if (!('children' in obj) || obj.children.length === 0){
      return;
    } else {

      let slide = pptx.addSlide();
      slide.addText(obj.topic, {x:0.5, y:"5%" , h: 1, w: "90%", fontFace: "Courier", fontWeight: 'bold', fontSize: 24, align: "center", bold:true })

      var strcount = 0;
      var childrentext = []
      var checkBullet = 0;

      for (var i = 0 ; i < obj.children.length ; i++){

        console.log(obj.children[i].topic);
        console.log('checkBullet '+ checkBullet);

        strcount+=obj.children[i].topic.length;
        
        if ( (i+1) % 11 == 0 ) {
          console.log('number 11 bullet push to new slide krub')
          slide.addText(childrentext, { x: 0.5, y: "25%", w: "90%", h: 4 ,valign:"top"});

          slide = pptx.addSlide();
          slide.addText(obj.topic + ' (ต่อ)', {x:0.5, y:"5%" , h: 1, w: "90%", fontFace: "Courier", fontWeight: 'bold', fontSize: 24, align: "center", bold:true })


          childrentext = [];
          childrentext.push({ text: obj.children[i].topic, options: {fontFace: "Courier", fontSize: 14, bullet: true, breakLine: true  } })
          strcount = 0;
          checkBullet = 0;

        } else if ( strcount > 1000 ) {

          if ( childrentext.length == 0 ){ //เป็นลูกตัวแรกแล้วใหญ่เกินกล่อง ให้ทำตั้งแต่หน้าแรก

            var firstslideText = obj.children[i].topic.slice(0,1000);
            slide.addText(firstslideText, { x: 0.5, y: "25%", w: "90%", h: 4 ,valign:"top", fontFace: "Courier", fontSize: 14, bullet: true, breakLine: true  });
            var whilecountIf = Math.ceil(obj.children[i].topic.length / 1000) - 1;

            var slicenumStart = 1001;
            var slicenumEnd = 2000;

            while ( whilecountIf !== 0 ) {

              let newSlide = pptx.addSlide();
              newSlide.addText(obj.topic + ' (ต่อ)', {x:0.5, y:"5%" , h: 1, w: "90%", fontFace: "Courier", fontWeight: 'bold', fontSize: 24, align: "center", bold:true })
              
              var topicSlice = obj.children[i].topic.slice(slicenumStart,slicenumEnd);
              if (slicenumStart == 0){
                newSlide.addText(topicSlice, { x: 0.5, y: "25%", w: "90%", h: 4 ,valign:"top",fontFace: "Courier", fontSize: 14, bullet: true, breakLine: true  });
              } else {
                newSlide.addText(topicSlice, { x: 0.5, y: "25%", w: "90%", h: 4 ,valign:"top",fontFace: "Courier", fontSize: 14, breakLine: true  });
              }
              whilecountIf -= 1;
              slicenumStart = slicenumEnd;
              if( Math.floor(obj.children[i].topic.length / 1000) !== 0 ) {
                slicenumEnd = slicenumEnd+1000;
              } else {
                slicenumEnd = obj.children[i].topic.length;    
              }    
            }

          } else { //ให้ทำหน้าต่อไป (หัวข้อมี (ต่อ) เติมท้าย)

            slide.addText(childrentext, { x: 0.5, y: "25%", w: "90%", h: 4 ,valign:"top", fontFace: "Courier", fontSize: 14, bullet: true, breakLine: true  });

            var whilecount = Math.ceil(obj.children[i].topic.length / 1000); //หารแล้วปัดขึ้น (2.3 => 3)
            console.log(whilecount);
            var slicenumStart = 0;
            var slicenumEnd = 1000;

            while ( whilecount !== 0 ) {

              let newSlide = pptx.addSlide();
              newSlide.addText(obj.topic + ' (ต่อ)', {x:0.5, y:"5%" , h: 1, w: "90%", fontFace: "Courier", fontWeight: 'bold', fontSize: 24, align: "center", bold:true })
              
              var topicSlice = obj.children[i].topic.slice(slicenumStart,slicenumEnd);
              if (slicenumStart == 0){
                newSlide.addText(topicSlice, { x: 0.5, y: "25%", w: "90%", h: 4 ,valign:"top",fontFace: "Courier", fontSize: 14, bullet: true, breakLine: true  });
              } else {
                newSlide.addText(topicSlice, { x: 0.5, y: "25%", w: "90%", h: 4 ,valign:"top",fontFace: "Courier", fontSize: 14, breakLine: true  });
              }
              whilecount -= 1;
              slicenumStart = slicenumEnd;
              if( Math.floor(obj.children[i].topic.length / 1000) !== 0 ) {
                slicenumEnd = slicenumEnd+1000;
              } else {
                slicenumEnd = obj.children[i].topic.length;    
              }    
            }
          }

          childrentext = [];
          strcount = 0;

          if ( i !== obj.children.length-1 ){

            slide = pptx.addSlide();
            slide.addText(obj.topic + ' (ต่อ)', {x:0.5, y:"5%" , h: 1, w: "90%", fontFace: "Courier", fontWeight: 'bold', fontSize: 24, align: "center", bold:true })
            checkBullet = 0;
          }

        } else {
          childrentext.push({ text: obj.children[i].topic, options: {fontFace: "Courier", fontSize: 14, bullet: true, breakLine: true  } })
          checkBullet += 1;
        }

      }

      slide.addText(childrentext, { x: 0.5, y: "25%", w: "90%", h: 4 ,valign:"top"});

      for (var j = 0 ; j < obj.children.length ; j++){
        createSlide(obj.children[j],pptx);
      }

    }
  }

  //Download pptx
  const exportPPTX = () => {

    var pptx = new PptxGenJS();
    var mindObj = mind.getAllData();
    createFirstSlide(mindObj.nodeData.topic, pptx);
    createSlide(mindObj.nodeData,pptx);
    pptx.writeFile({ fileName: "mindmap.pptx" });

  };

  return (
    <>
    <div>
      <Form.Group controlId="formFile" className="mb-3">
        <Form.Label>Import JSON File</Form.Label>
        <Form.Control type="file" onChange={readJSON}/>
      </Form.Group>
    </div>
    <div >
      <Button variant="outline-secondary" onClick={() => paint()}>Export PNG</Button>{' '}
      <Button variant="outline-success" onClick={() => exportData()}>Export JSON</Button>{' '}    
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