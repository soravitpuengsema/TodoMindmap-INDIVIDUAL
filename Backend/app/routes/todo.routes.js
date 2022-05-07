module.exports = app => {
    const todo = require("../controllers/todo.controller.js");

    var router = require("express").Router();

    router.post("/", todo.create);

    router.get("/", todo.findAll);

    router.get("/published", todo.findAllPublished);

    router.get("/:id", todo.findOne);

    router.put("/:nodeid", todo.update);

    router.delete("/:nodeid", todo.delete);

    router.delete("/", todo.deleteAll);

    app.use('/api/todo',router);
}