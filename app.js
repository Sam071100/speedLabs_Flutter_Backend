const express = require('express')
require('dotenv').config()
const bodyParser = require('body-parser')
const mysql = require('mysql')
const multer = require('multer')
const { s3Uploadv2, s3Uploadv3 } = require('./s3Service')
const { RestoreRequestType } = require('@aws-sdk/client-s3')
const uuid = require('uuid').v4
const app = express()
const port = process.env.PORT || 5000

// Parsing middleware
// Parse application/x-www-form-urlencoded

app.use(express.urlencoded({ extended: true })) // New
// Parse application/json

app.use(express.json()) // New

app.get('/', function (req, res) {
  res.send('Hello Samrat! Yeh Server hai!')
})

// MySQL Code goes here
const pool = mysql.createPool({
  connectionLimit: 30,
  host: '162.214.80.49', // This has to be asked by the Achintya Sir
  user: 'qjzcohmy_sip',
  password: 'Speedlabs@123',
  database: 'qjzcohmy_slmobileapp',
})

// Get all Questions
app.get('/questions', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err
    console.log('connected as id ' + connection.threadId)
    connection.query('SELECT * FROM question_detail', (err, rows) => {
      connection.release() // return the connection to pool

      if (!err) {
        res.send(rows)
      } else {
        console.log(err)
      }

      // if(err) throw err
      console.log('The data from question_detail table are: \n', rows)
    })
  })
})

// Get all Solutions
app.get('/solution', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err
    console.log('connected as id ' + connection.threadId)
    connection.query('SELECT * FROM solution_details', (err, rows) => {
      connection.release() // return the connection to pool

      if (!err) {
        res.send(rows)
      } else {
        console.log(err)
      }

      // if(err) throw err
      console.log('The data from solution_details table are: \n', rows)
    })
  })
})

// Get an question by id
app.get('/question/:id', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err
    connection.query(
      'SELECT * FROM question_detail WHERE question_id = ?',
      [req.params.id],
      (err, rows) => {
        connection.release() // return the connection to pool
        if (!err) {
          res.send(rows)
        } else {
          console.log(err)
        }

        console.log('The queried data from question_detail table are: \n', rows)
      },
    )
  })
})

// Get an solution by id
app.get('/solution/:id', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err
    connection.query(
      'SELECT * FROM solution_details WHERE sol_id = ?',
      [req.params.id],
      (err, rows) => {
        connection.release() // return the connection to pool
        if (!err) {
          res.send(rows)
        } else {
          console.log(err)
        }
        if (rows.length === 0) {
          console.log('data does not exist in the database')
        }
        console.log(
          'The queried data from solution_details table are: \n',
          rows,
        )
      },
    )
  })
})

// Get an solution by Question id
app.get('/solutionQid/:id', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err
    connection.query(
      'SELECT * FROM solution_details WHERE qsn_id = ?',
      [req.params.id],
      (err, rows) => {
        connection.release() // return the connection to pool
        if (!err) {
          res.send(rows)
        } else {
          console.log(err)
        }

        console.log(
          'The queried data from solution_details table are: \n',
          rows,
        )
      },
    )
  })
})

// Get evaluated solution by Question id
app.get('/evalsolQid/:id', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err
    connection.query(
      'SELECT * FROM eval_solutions WHERE qsn_id = ?',
      [req.params.id],
      (err, rows) => {
        connection.release() // return the connection to pool
        if (!err) {
          res.send(rows)
        } else {
          console.log(err)
        }

        console.log('The queried data from eval_solutions table are: \n', rows)
      },
    )
  })
})

// Delete a solution by id
app.delete('/solutionDelete/:id', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err
    connection.query(
      'DELETE FROM solution_details WHERE sol_id = ?',
      [req.params.id],
      (err, rows) => {
        connection.release() // return the connection to pool
        if (!err) {
          res.send(
            `solution_details with the record ID ${[
              req.params.id,
            ]} has been removed.`,
          )
        } else {
          console.log(err)
        }

        console.log('The data from solution_details table are: \n', rows)
      },
    )
  })
})

// Add Solution
app.post('/addSolution', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err

    const params = req.body
    connection.query(
      'INSERT INTO solution_details SET ?',
      params,
      (err, rows) => {
        connection.release() // return the connection to pool
        if (!err) {
          res.send(`solution with the record ID  has been added.`)
        } else {
          console.log(err)
        }

        console.log('The data from solution_details table are:11 \n', rows)
      },
    )
  })
})

// Add Solution to eval_Solutions databse
app.post('/addEvalSolution', (req, res) => {
  try {
    pool.getConnection((err, connection) => {
      if (err) throw err
      const params = req.body
      console.log(params);
    connection.query(
        'SELECT * FROM eval_solutions WHERE qsn_id = ? AND sol_id = ?',
        [params.qsn_id, params.sol_id],
        (err, rows) => {
          if (err) {
            console.log(err)
          }
          if (rows.length === 0) {
            connection.query(
                'INSERT INTO eval_solutions SET ?',
                params,
                (err, rows) => {
                  connection.release() // return the connection to pool
                  if (err) {
                    console.log(err)
                  }
                  console.log('Inserted the entry into the database');
                },
              )
          }
          else{
            console.log(rows);
            console.log("Yeh entry already databse mai present tha");
            connection.query(
                'UPDATE eval_solutions SET sol_url = ?, seqno = ?, audiourl = ?, remarks = ? WHERE sol_id = ? AND qsn_id = ?',
                [params.sol_url, params.seqno, params.audiourl, params.remarks, params.sol_id, params.qsn_id],
                (err, rows) => {
                  connection.release() // return the connection to pool
                  if (err) {
                    console.log(err);
                  }
                  console.log(`updated the entry already present in the database`);
                },
              )
          }
        },
      )
    })
    return res.json({ status: 'success 200 OK, solutions has been added successfully into the eval_solutions databse' })
  } catch (err) {
    console.log(err);
  }
})

app.post('/uploadRemarks', (req, res) => {
  try {
    pool.getConnection((err, connection) => {
      if (err) throw err
      const params = req.body
      connection.query(
        'UPDATE eval_solutions SET remarks = ? WHERE qsn_id = ?',
        [params.remarks, params.qsn_id],
        (err, rows) => {
          connection.release() // return the connection to pool
          if (err) {
            console.log(err);
          }
          console.log(`updated the remarks in the database with ${params.qsn_id}`);
        },
      )
    })
    return res.json({ status: 'success 200 OK, uploaded the remarks to Database' })
  } catch (err) {
    console.log(err);
  }
})

    // connection.query(
    //   'INSERT INTO eval_solutions SET ?',
    //   params,
    //   (err, rows) => {
    //     connection.release() // return the connection to pool
    //     if (!err) {
    //       res.send(`solutions has been added successfully into the eval_solutions databse.`);
    //     } else {
    //       res.send(err);
    //     }
    //     console.log('The data from solution_details table are:11 \n', rows)
    //   },
    // )
 

// Update a record / Solution
app.put('/updateSolution', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err
    console.log(`connected as id ${connection.threadId}`)

    const { id, name, tagline, description, image } = req.body

    connection.query(
      'UPDATE solution_details SET name = ?, tagline = ?, description = ?, image = ? WHERE sol_id = ?',
      [name, tagline, description, image, id],
      (err, rows) => {
        connection.release() // return the connection to pool

        if (!err) {
          res.send(`Solution with the name: ${name} has been added.`)
        } else {
          console.log(err)
        }
      },
    )

    console.log(req.body)
  })
})

//single file upload
// const upload = multer({ dest: "uploads/" });
// app.post("/upload", upload.single("file"), (req, res) => {
//   res.json({ status: "success" });
// });

// multiple file uploads
// const upload = multer({ dest: "uploads/" });
// app.post("/upload", upload.array("file", 2), (req, res) => {
//     console.log(req.files);
//   res.json({ status: "success" });
// });

// multiple fields upload
// const upload = multer({ dest: "uploads/" });

// const multiUpload = upload.fields([
//   { name: "avatar", maxCount: 1 },
//   { name: "resume", maxCount: 1 },
// ]);
// app.post("/upload", multiUpload, (req, res) => {
//   console.log(req.files);
//   res.json({ status: "success" });
// });

// custom filename

// const fileFilter = (req, file, cb) => {
//   console.log("file upload ka paryash hai 1");
//   console.log(req);
//   // console.log(file);
//   // console.log(cb);
//     if (file.mimetype.split("/")[0] === "image" || file.mimetype.split("/")[0] === "audio") {
//       cb(null, true);
//     } else {
//       cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
//     }
//   };

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads");
//     console.log("file upload ka paryash hai 2")
//   },
//   filename: (req, file, cb) => {
//     const { originalname } = file;
//     cb(null, `${uuid()}-${originalname}`);
//   },
// });

// const upload = multer({storage, fileFilter});
// app.post("/upload", upload.array("file", 2), (req, res) => {
//     console.log(req.files);
//   res.json({ status: "success" });
// });

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.split('/')[0] === 'application' ||
    file.mimetype.split('/')[0] === 'audio'
  ) {
    cb(null, true)
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'), false)
  }
}

// ["image", "jpeg"]
// ["audio", "mpeg"]

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1000000000, files: 10 },
})
app.post('/upload', upload.array('file'), async (req, res) => {
  try {
    const results = await s3Uploadv2(req.files)
    // console.log(req.body)
    console.log(results)
    // console.log('url yeh hai' + results[0]['Location'])
    req.body['sol_url'] = results[0]['Location']
    // console.log(req.body);
    pool.getConnection((err, connection) => {
      if (err) throw err
      const params = req.body
      //   console.log(params);
      //   console.log(params.qsn_id);

      // TO check if the entry is already present in the database. IF true then the entry is already present else the entry is not present

      // We check whether the data is already present in the databse
    connection.query(
        'SELECT * FROM eval_solutions WHERE qsn_id = ? AND sol_id = ?',
        [params.qsn_id, params.sol_id],
        (err, rows) => {
          if (err) {
            console.log(err)
          }
          if (rows.length === 0) {
            connection.query(
                'INSERT INTO eval_solutions SET ?',
                params,
                (err, rows) => {
                  connection.release() // return the connection to pool
                  if (err) {
                    console.log(err)
                  }
                  console.log('Inserted the entry into the database');
                },
              )
          }
          else{
            console.log(rows);
            console.log("Yeh entry already databse mai present tha");
            connection.query(
                'UPDATE eval_solutions SET sol_url = ?, seqno = ?, audiourl = ?, remarks = ? WHERE sol_id = ? AND qsn_id = ?',
                [params.sol_url, params.seqno, params.audiourl, params.remarks, params.sol_id, params.qsn_id],
                (err, rows) => {
                  connection.release() // return the connection to pool
                  if (err) {
                    console.log(err);
                  }
                  console.log(`updated the entry already present in the database`);
                },
              )
          }
        },
      )
    //   console.log(flag);
    //   if (flag === true) {
        // Already the entry is present in the database, so we have to only update the entry
        // connection.query(
        //     'UPDATE eval_solutions SET sol_url = ?, seqno = ?, audiourl = ?, remarks = ? WHERE sol_id = ? AND qsn_id = ?',
        //     [params.sol_url, params.seqno, params.audiourl, params.remarks, params.sol_id, params.qsn_id],
        //     (err, rows) => {
        //       connection.release() // return the connection to pool
        //       if (err) {
        //         console.log(err);
        //       }
        //       console.log(`updated the entry already present in the database`);
        //     },
        //   )
    //   } else {
        // entry is not presnt in the database, so we have to insert the entry
        // connection.query(
        //   'INSERT INTO eval_solutions SET ?',
        //   params,
        //   (err, rows) => {
        //     connection.release() // return the connection to pool
        //     if (err) {
        //       console.log(err)
        //     }
        //     console.log('Inserted the entry into the database');
        //   },
        // )
    //   }
    })
    return res.json({ status: 'success 200 OK, uploaded the URL to database' })
  } catch (err) {
    console.log(err);
  }
})

app.post('/uploadAudio', upload.array('file'), async (req, res) => {
  try {
    const results = await s3Uploadv2(req.files)
    // console.log(req.body)
    console.log(results)
    // console.log('url yeh hai' + results[0]['Location'])
    req.body['audiourl'] = results[0]['Location']
    // console.log(req.body);
    pool.getConnection((err, connection) => {
      if (err) throw err
      const params = req.body
      connection.query(
        'UPDATE eval_solutions SET audiourl = ? WHERE qsn_id = ?',
        [params.audiourl, params.qsn_id],
        (err, rows) => {
          connection.release() // return the connection to pool
          if (err) {
            console.log(err);
          }
          console.log(`updated the audioURL in the database with ${params.qsn_id}`);
        },
      )
    })
    return res.json({ status: 'success 200 OK, uploaded the audioURL to AWS' })
  } catch (err) {
    console.log(err);
  }
})

// app.post("/upload", upload.array("file"), async (req, res) => {
//   try {
//     const results = await s3Uploadv3(req.files);
//     console.log(results);
//     return res.json({ status: "success" });
//   } catch (err) {
//     console.log(err);
//   }
// });

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'file is too large',
      })
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'File limit reached',
      })
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'File must be an image or audio',
      })
    }
  }
})

// Listen on enviroment port or 5000
app.listen(port, () => console.log(`Listening on port ${port}`))
