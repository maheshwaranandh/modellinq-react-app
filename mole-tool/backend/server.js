const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const archiver = require('archiver');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'build')));  // Serve React app from build directory

app.post('/update-file', (req, res) => {
    const data = req.body;
    const filePath = path.join(__dirname, '../../mols_src/usermols.inp');

    const content = `
${data.location}
${data.moleculeName}
${data.sequence}
${data.numberOfCycles}
2
4
1
1
1
2.0 1
`;

    fs.writeFile(filePath, content.trim(), (err) => {
        if (err) {
            console.error('Error writing to file', err);
            return res.status(500).send('Error writing to file');
        }

        const execPath = path.join(__dirname, '../../mols_src/./lmols');
        exec(execPath, (err, stdout, stderr) => {
            if (err) {
                console.error('Error executing lmols', err);
                return res.status(500).send('Error executing lmols');
            }
            console.log(`lmols stdout: ${stdout}`);
            console.error(`lmols stderr: ${stderr}`);

            const resultsPath = path.join(__dirname, '../../mols_src/results');
            const outputZip = path.join(__dirname, '../../mols_src/results.zip');
            const output = fs.createWriteStream(outputZip);
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            output.on('close', () => {
                console.log(`Zip file created: ${archive.pointer()} total bytes`);
                res.json({ downloadUrl: `http://${req.hostname}:${PORT}/mols_src/results.zip` });
            });

            archive.on('error', (err) => {
                console.error('Error creating zip file', err);
                return res.status(500).send('Error creating zip file');
            });

            archive.pipe(output);
            archive.directory(resultsPath, false);
            archive.finalize();
        });
    });
});

app.get('/mols_src/results.zip', (req, res) => {
    const filePath = path.join(__dirname, '../../mols_src/results.zip');
    res.download(filePath, 'results.zip', (err) => {
        if (err) {
            console.error('Error sending zip file', err);
            res.status(500).send('Error sending zip file');
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
