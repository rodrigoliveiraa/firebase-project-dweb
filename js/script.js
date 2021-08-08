document.addEventListener("DOMContentLoaded", function() {
    const sidenav = document.querySelector(".sidenav");
    M.Sidenav.init(sidenav);
    const modals = document.querySelectorAll(".modal");
    M.Modal.init(modals);
    const dropdown = document.querySelector(".dropdown-trigger");
    M.Dropdown.init(dropdown, {
        alignment: "center",
        coverTrigger: false,
        hover: true,
        constrainWidth: false,
    });
});
const signUpBtn = document.querySelector("#sign-up-btn");
if (signUpBtn) {
    signUpBtn.addEventListener("click", (e) => {
        const newUserEmail = document.querySelector("#sign-up-email").value;
        const newUserPassword = document.querySelector("#sign-up-password").value;
        e.preventDefault();
        const preloader = document.querySelector("#signup-preloader");
        const errorText = document.querySelector("#signup-error-text");
        preloader.style.display = "block";
        auth
            .createUserWithEmailAndPassword(newUserEmail, newUserPassword)
            .catch((err) => {
                errorText.innerHTML = err.message;
                errorText.style.display = "block";
                preloader.style.display = "none";
            })
            .then((credential) => {
                sendNewUserVerificationEmail(credential);
                if (credential) {
                    db.collection("todos")
                        .doc(credential.user.uid)
                        .set({
                            todos: [],
                        })
                        .then(() => {
                            window.location.assign("todo.html");
                        });
                }
            });
    });
}

function sendNewUserVerificationEmail(credential) {
    if (credential) {
        const user = credential.user;
        user.sendEmailVerification().then(() => {});
    }
}
const loginBtn = document.querySelector("#login-btn");
if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const userEmail = document.querySelector("#login-email").value;
        const userPassword = document.querySelector("#login-password").value;
        const preloader = document.querySelector("#login-preloader");
        const errorText = document.querySelector("#login-error-text");
        preloader.style.display = "block";
        auth
            .signInWithEmailAndPassword(userEmail, userPassword)
            .then((credential) => {
                window.location.assign("todo.html");
            })
            .catch((err) => {
                errorText.innerHTML = err.message;
                errorText.style.display = "block";
                preloader.style.display = "none";
            });
    });
}
const logoutBtn = document.querySelector("#logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        auth.signOut();
    });
}
const dontLogoutBtns = document.querySelectorAll(".close-modal");
if (dontLogoutBtns) {
    dontLogoutBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const modal = document.querySelector("#logout-modal");
            M.Modal.getInstance(modal).close();
        });
    });
}
auth.onAuthStateChanged((user) => {
    if (user) {
        showTodos(user);
        validateInput(user);
        showNotVerified(user);
    } else {
        if (window.location.href.includes("todo.html")) {
            window.location.assign("index.html");
        }
    }
});

function showNotVerified(user) {
    const text = document.querySelector(".not-verified");
    if (!user.emailVerified) {
        text.style.display = "block";
    }
}

function validateInput(user) {
    const addTodoBtn = document.querySelector("#add-todo-btn");
    addTodoBtn.addEventListener("click", () => {
        const inputText = document.querySelector("#input-text").value;
        if (inputText != "") {
            showConfirmation("Tarefa adicionada", "tick");
            addTodo(user, inputText);
        } else {
            showConfirmation("Voce precisa cadastrar uma tarefa", "alert");
        }
    });
}

function showConfirmation(text, image) {
    const modal = document.querySelector("#confirmation");
    const confirmationText = document.querySelector("#confirmation-text");
    const confirmationImage = document.querySelector("#confirmation-img");
    confirmationText.innerHTML = text;
    confirmationImage.src = `../images/icons/${image}.png`;
    M.Modal.getInstance(modal).open();
}

function addTodo(user, inputText) {

    const preloader = document.querySelector("#preloader");
    preloader.style.display = "block";

    let todoArr;
    const todoObj = { todoItem: inputText, checkedStatus: "no-check" };

    db.collection("todos")
        .doc(user.uid)
        .get()
        .then((doc) => {
            todoArr = doc.data().todos;
            todoArr.push(todoObj);
        })
        .then(() => {
            db.collection("todos")
                .doc(user.uid)
                .set({
                    todos: todoArr,
                })
                .then(() => {
                    let inputText = document.querySelector("#input-text");
                    let inputLabel = document.querySelector("#input-label");

                    inputText.value = "";
                    inputLabel.classList.remove("active");
                    inputText.classList.remove("valid");

                    showTodos(user);
                });
        });
}


function showTodos(user) {
    let todoItems;
    let html = "";
    const list = document.querySelector("#list");
    const preloader = document.querySelector("#preloader");
    db.collection("todos")
        .doc(user.uid)
        .get()
        .then((doc) => {
            todoItems = doc.data().todos;

            todoItems.forEach((item) => {
                html += `
        <li class="collection-item row valign-wrapper todo-item">
        <label class="col s10 m11">
        <input type="checkbox" ${item.checkedStatus} />
        <span>${item.todoItem}</span>
      </label>
      <a href="#!" class="secondary-content col s2 m1 btn delete-todo-btn"><i class="material-icons">delete</i></a>
      </li>
        `;
            });

            if (preloader) {
                preloader.style.display = "none";
            }

            list.innerHTML = html;

            const items = document.querySelectorAll(".todo-item");
            items.forEach((item, index) => {
                item.addEventListener("click", (e) => {
                    savedCheckedTodoItems(item, user, index, e, todoItems);
                });
            });

            const selectAllBtn = document.querySelector("#select-all-checkbox");
            selectAllBtn.addEventListener("click", (e) => {
                selectAllTodoItems(user, e);
            });

            const deleteTodoBtn = document.querySelectorAll(".delete-todo-btn");
            deleteTodoBtn.forEach((btn, index) => {
                btn.addEventListener("click", (e) => {
                    deleteTodoItem(btn, index, user);
                });
            });

            const deleteAllBtn = document.querySelector("#delete-all-btn");
            deleteAllBtn.addEventListener("click", () => {
                deleteSelectedTodoItems(user);
            });
        });
}

function deleteTodoItem(btn, index, user) {

    let todoItems;
    db.collection("todos")
        .doc(user.uid)
        .get()
        .then((doc) => {
            todoItems = doc.data().todos;

            todoItems.splice(index, 1);

            btn.parentElement.remove();

            db.collection("todos").doc(user.uid).set({
                todos: todoItems,
            });
            showTodos(user);
        });
}


function selectAllTodoItems(user, e) {
    const uiTodoItems = document.querySelectorAll(".todo-item");
    let todoItems;
    if (e.target.checked == true) {

        uiTodoItems.forEach((item) => {
            item.firstElementChild.firstElementChild.checked = true;
        });
        db.collection("todos")
            .doc(user.uid)
            .get()
            .then((doc) => {
                todoItems = doc.data().todos;

                todoItems.forEach((item) => {
                    item.checkedStatus = "checked";
                });

                db.collection("todos").doc(user.uid).set({
                    todos: todoItems,
                });
            });
    } else {

        uiTodoItems.forEach((item) => {
            item.firstElementChild.firstElementChild.checked = false;
        });

        db.collection("todos")
            .doc(user.uid)
            .get()
            .then((doc) => {
                todoItems = doc.data().todos;

                todoItems.forEach((item) => {
                    item.checkedStatus = "no-check";
                });
                db.collection("todos").doc(user.uid).set({
                    todos: todoItems,
                });
            });
    }
}

function deleteSelectedTodoItems(user) {
    const selectAllBtn = document.querySelector("#select-all-checkbox");
    const uiTodoItems = document.querySelectorAll(".todo-item");
    let todoItems;
    db.collection("todos")
        .doc(user.uid)
        .get()
        .then((doc) => {
            todoItems = doc.data().todos;

            const newItems = todoItems.filter((item) => {
                return item.checkedStatus != "checked";
            });

            todoItems = newItems;

            uiTodoItems.forEach((item) => {
                if (item.firstElementChild.firstElementChild.checked == true) {
                    item.remove();
                }
            });

            db.collection("todos").doc(user.uid).set({
                todos: todoItems,
            });
            selectAllBtn.checked = false;
            showTodos(user);
        });

}

function savedCheckedTodoItems(item, user, index, e) {

    let todoItems;
    db.collection("todos")
        .doc(user.uid)
        .get()
        .then((doc) => {
            todoItems = doc.data().todos;

            if (e.target.checked == true) {

                todoItems[index].checkedStatus = "checked";

                db.collection("todos").doc(user.uid).set({
                    todos: todoItems,
                });

            } else if (e.target.checked == false) {
                todoItems[index].checkedStatus = "no-check";
                db.collection("todos").doc(user.uid).set({
                    todos: todoItems,
                });
            }
        });
}