class APIFeatures {
  constructor(query, queryString) {
    ((this.query = query), (this.queryString = queryString));
  }

  // // ---------FILTERING---------- // //
  filter() {
    const queryObj = { ...this.queryString };
    const execludeFields = ["page", "sort", "limit", "fields"];
    execludeFields.forEach((el) => delete queryObj[el]);

    // // --- ADVANCED FILTERING --- // //
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query.find(JSON.parse(queryStr));

    // ⭐ SEARCH IMPLEMENTATION
    if (this.queryString.search) {
      const search = this.queryString.search;

      this.query = this.query.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { model: { $regex: search, $options: "i" } },
          { company: { $regex: search, $options: "i" } },
        ],
      });
    }

    return this;
  }

  // // -------- SORTING ----------- // //
  sort() {
    let sortBy = {};
    if (this.queryString.sort) {
      const fields = this.queryString.sort.split(",");
      fields.forEach((field) => {
        if (field.startsWith("-")) {
          sortBy[field.substring(1)] = -1; // descending
        } else {
          sortBy[field] = 1; // ascending
        }
      });
      this.query.sort(sortBy);
    } else {
      sortBy = { createdAt: -1 }; // default sort
      this.query.sort(sortBy);
    }
    return this;
  }

  // // ------FIELD LIMITING --------// //
  limitFields() {
    if (this.queryString.fields) {
      const fields = req.query.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  // // --------PAGINATION---------- // //
  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
