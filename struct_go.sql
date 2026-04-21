-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 21, 2026 at 12:51 PM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `struct_go`
--

-- --------------------------------------------------------

--
-- Table structure for table `consultation_logs`
--

CREATE TABLE `consultation_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `audio_filename` varchar(255) DEFAULT NULL,
  `transcript_filename` varchar(255) DEFAULT NULL,
  `transcript_text` longtext,
  `paper_filename` varchar(255) DEFAULT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feedback_items`
--

CREATE TABLE `feedback_items` (
  `id` bigint UNSIGNED NOT NULL,
  `log_id` bigint UNSIGNED NOT NULL,
  `content` text NOT NULL,
  `category` enum('Minor','Major') NOT NULL,
  `status` enum('Fixed','Pending') NOT NULL DEFAULT 'Pending',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lecturers`
--

CREATE TABLE `lecturers` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `nip` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `faculty` varchar(100) DEFAULT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `lecturers`
--

INSERT INTO `lecturers` (`id`, `user_id`, `nip`, `name`, `faculty`, `created_at`, `updated_at`, `deleted_at`) VALUES
(4, 5, '198001012005011001', 'Dr. Arsitek Go, M.Kom', 'Informatika', '2026-04-21 17:42:59.678', '2026-04-21 17:42:59.678', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `lecturer_id` bigint UNSIGNED NOT NULL,
  `nim` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `prodi` varchar(100) DEFAULT NULL,
  `thesis_title` text,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `user_id`, `lecturer_id`, `nim`, `name`, `prodi`, `thesis_title`, `created_at`, `updated_at`, `deleted_at`) VALUES
(4, 6, 4, '2200010001', 'Budi Mahasiswa', 'Teknik Informatika', 'Implementasi Microservices pada Sistem Log Bimbingan', '2026-04-21 17:54:49.453', '2026-04-21 17:54:49.453', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','lecturer') NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `updated_at`, `deleted_at`) VALUES
(5, 'dosen1@university.ac.id', '', 'lecturer', '2026-04-21 17:37:12.802', '2026-04-21 17:37:12.802', NULL),
(6, 'mhs1@university.ac.id', '', 'student', '2026-04-21 17:39:42.318', '2026-04-21 17:39:42.318', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `consultation_logs`
--
ALTER TABLE `consultation_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_consultation_logs_deleted_at` (`deleted_at`),
  ADD KEY `fk_consultation_logs_student` (`student_id`);

--
-- Indexes for table `feedback_items`
--
ALTER TABLE `feedback_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_feedback_items_deleted_at` (`deleted_at`),
  ADD KEY `fk_consultation_logs_feedback_items` (`log_id`);

--
-- Indexes for table `lecturers`
--
ALTER TABLE `lecturers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uni_lecturers_nip` (`nip`),
  ADD KEY `idx_lecturers_deleted_at` (`deleted_at`),
  ADD KEY `fk_users_lecturer` (`user_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uni_students_nim` (`nim`),
  ADD KEY `idx_students_deleted_at` (`deleted_at`),
  ADD KEY `fk_students_lecturer` (`lecturer_id`),
  ADD KEY `fk_users_student` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uni_users_email` (`email`),
  ADD KEY `idx_users_deleted_at` (`deleted_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `consultation_logs`
--
ALTER TABLE `consultation_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feedback_items`
--
ALTER TABLE `feedback_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lecturers`
--
ALTER TABLE `lecturers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `consultation_logs`
--
ALTER TABLE `consultation_logs`
  ADD CONSTRAINT `fk_consultation_logs_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `feedback_items`
--
ALTER TABLE `feedback_items`
  ADD CONSTRAINT `fk_consultation_logs_feedback_items` FOREIGN KEY (`log_id`) REFERENCES `consultation_logs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_feedback_items_log` FOREIGN KEY (`log_id`) REFERENCES `consultation_logs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lecturers`
--
ALTER TABLE `lecturers`
  ADD CONSTRAINT `fk_lecturers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_users_lecturer` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_students_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_users_student` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
