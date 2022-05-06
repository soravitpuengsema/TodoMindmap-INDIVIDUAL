import './App.css';
import React, { useState, useEffect} from 'react';
import ReactDOM from "react-dom";
import MindElixir, { E } from "mind-elixir";
import painter from 'mind-elixir/dist/painter';
import { Button, Form, Modal } from 'react-bootstrap';
import TodoListDataService from "./services/todo.service";
import Popup from 'reactjs-popup';
import Fab from '@mui/material/Fab';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import hotkeys from 'hotkeys-js';
import ReactPlayer from 'react-player'
import Select from 'react-select'
import useMediaQuery from '@mui/material/useMediaQuery';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

//
let mind = null;

function App() {
  var mindstring = '';
  let datajson = '';
  let updateCheck = false;

  //let mind = null;
  let selectnode = null;
  let dbnow = null;
  let dbMindmap = null;

  //var searchList = [];
  const [searchList, setSearchList] = React.useState([]);

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

        setSearchList([]);
        searchDropdown(mind.nodeData);

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
          setSearchList([]);
          searchDropdown(mind.nodeData);
    
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

          setSearchList([]);
          searchDropdown(dbjson.nodeData);
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
                nodeid: ope.obj.parent.id //Date.now()+ope.obj.parent.topic.replace(/ /g,"_")
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
          setSearchList([]);
          searchDropdown(dbjson.nodeData);
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
      setSearchList([]);
      searchDropdown(mind.nodeData);
      
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

  //สร้างลิสต์ dropdown
  const searchDropdown = (obj) => {
    //console.log(obj.topic,text)
    if (!('children' in obj) || obj.children.length === 0 ){ //ถ้าไม่มีลูกและไม่ใช่ root Todo ข้าม
      if ( !obj.hasOwnProperty('root') ){
        setSearchList(searchList => [...searchList,{value: obj.id, label: obj.topic}])
      }
      return;

    } else { //มีลูก ไล่ทำลูกทุกตัว
      if ( !obj.hasOwnProperty('root') ){
        setSearchList(searchList => [...searchList,{value: obj.id, label: obj.topic}])
      }
      for (let i = 0 ; i < obj.children.length ; i++){
        searchDropdown(obj.children[i])
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

  const findNodeCoordinates = (event) => {
    console.log(event)
    mind.selectNode(E(event.value))

    let xystring = E(event.value).parentElement.parentElement.getAttribute('style');

    if ( xystring == null ){
      xystring = E(event.value).parentElement.parentElement.parentElement.parentElement.getAttribute('style');
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
  }

  const matches = useMediaQuery('(max-width:992px)');

  return (
    <>
    <div>
      <Form.Group controlId="formFile" className="mb-3">
        <Form.Label>Import JSON File</Form.Label>
        <Form.Control type="file" onChange={readJSON}/>
      </Form.Group>
    </div>
    <div>
      <Select 
        options={searchList} 
        onChange={findNodeCoordinates}
        />
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
          <div style={{display:'block'}}>
          <Modal.Dialog size={'lg'} >
            <Modal.Header>
              <Modal.Title style={{fontSize:'26px'}}>การใช้งาน MindmapTodo</Modal.Title>
              <LightbulbIcon color='primary'></LightbulbIcon>
            </Modal.Header>
            <Modal.Body style={{textAlign:'center',fontSize:'18px',maxHeight: 'calc(100vh - 300px)',overflowY: 'auto'}}>
            <ReactPlayer loop={true} playing={true} volume={null} muted={true} height={matches? '238px':'400px'} width={'100%'} url='https://streamable.com/96kl0l' />
              <p>
                <br/>
                สร้าง แก้ไข ลบโนดในมายแมพได้ง่ายๆเพียงแค่คลิกขวาที่โนด จากนั้นเลือกจากเมนูหรือกดปุ่มคีย์ลัดดังนี้
                <br/>
                <br/>
                สร้างลูกโนด: Tab
                <br/>
                สร้างโนดพี่น้อง: Enter
                <br/>
                ลบโนด: Delete
                <br/>
                เพิ่มแท็ก Todo: t
                <br/>      
                ลบแท็ก Todo: d
              </p>
              <p>
                <br/>
                โดยลูกของโนดเริ่มต้นที่มีแท็ก Todo นั้นจะถูกสร้างเป็นรายการ Todo โดยโนดตัวนั้นจะเป็นชื่อ Title ของ
                <br/>
                รายการ Todo ถ้าโนดนี้ไม่มีลูกจะเป็นรายการที่ไม่มีข้อมูล Description
                <br/>
                {/* ลูกของโนดเริ่มต้นที่มีแท็ก Todo จะถูกเพิ่มเป็นรายการ Todo โดยโนดนั้นจะเป็น Title และถ้ามีลูกต่อเพิ่ม 
                <br/>
                โนดลูกนั้นจะเป็น Description ถ้ามีโนด Description ในโนด Title หลายตัวจะเป็นการสร้างรายการ
                <br/>
                Todo หลายรายการที่ชื่อเดียวกัน แต่มี Description ที่ต่างกันตามโนดนั้นๆ ถูกเพิ่มเข้าในแอพพลิเคชั่น */}
              </p>
              <img style={{width:'80%'}}src='https://i.ibb.co/t8z0GDX/nodesc.png' alt='nodesc'></img>
              <p>
                <br/>
                <br/>
                ถ้าโนด Title มีลูก ลูกตัวนั้นจะเป็น Description ของรายการ Todo นั้น เช่น กรณีมีลูกตัวเดียว
                <br/>
              </p>
              <img style={{width:'80%'}}src='https://i.ibb.co/Cs1VcK1/single-desc.png' alt='singledesc'></img>
              <p>
                <br/>
                <br/>
                ถ้าโนด Title มีลูกหลายตัว จะเป็นการสร้างรายการ Todo ตามจำนวนลูก โดยมี Title เหมือนกันแต่
                <br/>
                มี Description ที่ต่างกันตามโนดลูกแต่ละตัว
                <br/>
              </p>
              <img style={{width:'80%'}}src='https://i.ibb.co/z6Sb20v/multipledesc.png' alt='multipledesc'></img>
            </Modal.Body>
          </Modal.Dialog>
          </div>
      </Popup>
    </div>
    <div id="map" style={{ height: "600px", width: "100%" }} />
    </>
  );
}

export default App;