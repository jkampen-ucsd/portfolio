import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;
let commits = [];

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {

            let first = lines[0];

            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: 'https://github.com/jkampen-ucsd/portfolio/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,

                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,

                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: false,
                configurable: false,
            });

            return ret;
        });
}

function renderCommitInfo(data, commits) {

    // Clear existing stats before rendering
    d3.select('#stats').selectAll('*').remove();

    // Create definition list
    const dl = d3.select('#stats')
        .append('dl')
        .attr('class', 'stats');

    // Calculate total files
    const totalFiles = d3.group(data, d => d.file).size;

    // Calculate file lengths
    const fileLengths = d3.rollups(
        data,
        (v) => d3.max(v, d => d.line),
        (d) => d.file
    );

    // Calculate average file length
    const averageFileLength = d3.mean(
        fileLengths,
        d => d[1]
    );

    // Calculate average line length
    const averageLineLength = d3.mean(
        data,
        d => d.length
    );

    // Calculate maximum indentation depth
    const maxDepth = d3.max(
        data,
        d => d.depth
    );

    // Total lines of code
    dl.append('dt')
        .html('Total <abbr title="Lines of code">LOC</abbr>');

    dl.append('dd')
        .text(data.length.toLocaleString());

    // Total commits
    dl.append('dt')
        .text('Total commits');

    dl.append('dd')
        .text(commits.length.toLocaleString());

    // Total files
    dl.append('dt')
        .text('Total files');

    dl.append('dd')
        .text(totalFiles.toLocaleString());

    // Average file length
    dl.append('dt')
        .text('Avg. file length');

    dl.append('dd')
        .text(`${Math.round(averageFileLength ?? 0)} lines`);

    // Average line length
    dl.append('dt')
        .text('Avg. line length');

    dl.append('dd')
        .text(`${(averageLineLength ?? 0).toFixed(1)} characters`);

    // Maximum depth
    dl.append('dt')
        .text('Max depth');

    dl.append('dd')
        .text(maxDepth ?? 0);
}

function renderTooltipContent(commit) {

    // Do nothing if no commit is provided
    if (!commit || Object.keys(commit).length === 0) {
        return;
    }

    // Get tooltip elements
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    // Update commit link
    link.href = commit.url;
    link.textContent = commit.id;

    // Format commit date
    date.textContent = commit.datetime.toLocaleString('en', {
        dateStyle: 'full'
    });

    // Format commit time
    time.textContent = commit.datetime.toLocaleString('en', {
        timeStyle: 'short'
    });

    // Display author
    author.textContent = commit.author;

    // Display number of lines
    lines.textContent = commit.totalLines.toLocaleString();
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');

    // Offset tooltip slightly from cursor
    const offset = 15;

    let x = event.clientX + offset;
    let y = event.clientY + offset;

    // Get tooltip dimensions
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    // Prevent tooltip from going off right edge
    if (x + tooltipWidth > window.innerWidth) {
        x = event.clientX - tooltipWidth - offset;
    }

    // Prevent tooltip from going off bottom edge
    if (y + tooltipHeight > window.innerHeight) {
        y = event.clientY - tooltipHeight - offset;
    }

    // Update tooltip position
    tooltip.style.left = `${Math.max(0, x)}px`;
    tooltip.style.top = `${Math.max(0, y)}px`;
}


// ============================================================
// STEP 5: BRUSHING
// ============================================================

// Determine whether a commit is inside the brush selection
function isCommitSelected(selection, commit) {

    if (!selection) {
        return false;
    }

    const [[x0, y0], [x1, y1]] = selection;

    // Convert commit data into chart coordinates
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return (
        x >= x0 &&
        x <= x1 &&
        y >= y0 &&
        y <= y1
    );
}

// Display number of selected commits
function renderSelectionCount(selection) {

    const selectedCommits = selection
        ? commits.filter(d => isCommitSelected(selection, d))
        : [];

    const countElement = document.querySelector('#selection-count');

    countElement.textContent =
        `${selectedCommits.length || 'No'} commits selected`;

    return selectedCommits;
}

// Display programming language breakdown
function renderLanguageBreakdown(selection) {

    const selectedCommits = selection
        ? commits.filter(d => isCommitSelected(selection, d))
        : [];

    const container = document.getElementById('language-breakdown');

    // Clear breakdown if nothing is selected
    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Collect lines from selected commits
    const lines = selectedCommits.flatMap(d => d.lines);

    // Count lines by language
    const breakdown = d3.rollup(
        lines,
        v => v.length,
        d => d.type
    );

    // Clear existing content
    container.innerHTML = '';

    // Display language statistics
    for (const [language, count] of breakdown) {

        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        const dt = document.createElement('dt');
        dt.textContent = language;

        const dd = document.createElement('dd');
        dd.textContent = `${count} lines (${formatted})`;

        container.append(dt, dd);
    }
}

// Handle brush selection changes
function brushed(event) {

    const selection = event.selection;

    // Highlight selected dots
    d3.select('#chart')
        .selectAll('.dots circle')
        .classed('selected', d =>
            isCommitSelected(selection, d)
        );

    // Update selected commit count
    renderSelectionCount(selection);

    // Update language breakdown
    renderLanguageBreakdown(selection);
}

function renderScatterPlot(data, commits) {

    // Set chart dimensions
    const width = 1000;
    const height = 600;

    // Define margins
    const margin = {
        top: 10,
        right: 10,
        bottom: 30,
        left: 55
    };

    // Calculate usable chart area
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom
    };

    // Clear previous chart
    d3.select('#chart').selectAll('*').remove();

    // Create SVG
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Find minimum and maximum lines per commit
    const [minLines, maxLines] = d3.extent(
        commits,
        d => d.totalLines
    );

    // Create square root scale for dot radius
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    // Add horizontal gridlines FIRST
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    // Create axes
    const xAxis = d3.axisBottom(xScale);

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Sort commits by total lines (largest first)
    // This ensures smaller dots appear on top
    const sortedCommits = d3.sort(
        commits,
        d => -d.totalLines
    );

    // Create dots group
    const dots = svg
        .append('g')
        .attr('class', 'dots');

    // Draw circles
    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))

        // Size dots according to lines edited
        .attr('r', d => rScale(d.totalLines))

        // Apply color and transparency
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)

        // Mouse enters a dot
        .on('mouseenter', (event, commit) => {

            // Highlight hovered dot
            d3.select(event.currentTarget)
                .style('fill-opacity', 1);

            // Update tooltip
            renderTooltipContent(commit);

            // Show tooltip
            updateTooltipVisibility(true);

            // Position tooltip near cursor
            updateTooltipPosition(event);
        })

        // Mouse moves over a dot
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })

        // Mouse leaves a dot
        .on('mouseleave', (event) => {

            // Restore transparency
            d3.select(event.currentTarget)
                .style('fill-opacity', 0.7);

            // Hide tooltip
            updateTooltipVisibility(false);
        });
        // --------------------------------------------------------
    // BRUSH SELECTION
    // --------------------------------------------------------

    // Create brush and listen for selection events
    const brush = d3.brush()
        .extent([
            [usableArea.left, usableArea.top],
            [usableArea.right, usableArea.bottom]
        ])
        .on('start brush end', brushed);

    // Add brush to SVG
    const brushGroup = svg
        .append('g')
        .attr('class', 'brush')
        .call(brush);

    // Keep dots above the brush overlay so tooltips still work
    dots.raise();
    }

let data = await loadData();
commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);